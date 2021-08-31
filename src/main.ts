/*
 * Created with @iobroker/create-adapter v1.34.1
 */

import * as utils from '@iobroker/adapter-core';

import axios from 'axios';
import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/database';
import 'firebase/functions';
import 'firebase/storage';

import { CONFIG, DATABASES, URL_APIKEY } from './consts';
import { AdapterSyncService } from './lib/adapter-service';
import { DeviceService } from './lib/device-service';
import { EnumSyncService } from './lib/enum-service';
import { HostSyncService } from './lib/host-service';
import { InstanceSyncService } from './lib/instance-service';
import { LocationService } from './lib/location-service';
import { MessageSendService } from './lib/message-service';
import { StateSyncService } from './lib/state-service';

class Iogopro extends utils.Adapter {
    private app = firebase.initializeApp(CONFIG);
    private loggedIn = false;
    private adapterService: AdapterSyncService | undefined;
    private deviceService: DeviceService | undefined;
    private enumService: EnumSyncService | undefined;
    private hostService: HostSyncService | undefined;
    private instanceService: InstanceSyncService | undefined;
    private locationService: LocationService | undefined;
    private messageService: MessageSendService | undefined;
    private stateService: StateSyncService | undefined;

    public constructor(options: Partial<utils.AdapterOptions> = {}) {
        super({
            ...options,
            name: 'iogopro',
        });
        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        this.on('objectChange', this.onObjectChange.bind(this));
        this.on('message', this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    /**
     * Is called when databases are connected and adapter received configuration.
     */
    private async onReady(): Promise<void> {
        // Initialize your adapter here
        this.setState('info.connection', false, true);

        if (this.config.apikey == null) {
            this.log.warn('ApiKey is missing, please add apikey in config!');
            return;
        }

        const language = (await this.getForeignObjectAsync('system.config'))?.common.language || 'en';

        try {
            const response = await axios.post(URL_APIKEY, { apikey: this.config.apikey });
            if (response.status != 200) {
                this.log.error('main:' + JSON.stringify(response.statusText));
                return;
            }
            firebase
                .auth()
                .signInWithCustomToken(response.data.token)
                .catch((error) => {
                    this.log.error('Authentication: ' + error.code + ' # ' + error.message);
                    return;
                });
        } catch (error) {
            this.log.error('main: your apikey is invalid error:' + error);
            return;
        }

        firebase.auth().onAuthStateChanged((user) => {
            this.loggedIn = false;
            this.log.debug('main: onAuthStateChanged');
            if (user && !user.isAnonymous) {
                user.getIdTokenResult()
                    .then((idTokenResult) => {
                        const server = idTokenResult.claims.server;
                        if (server) {
                            this.log.info('main: logged in successfully');
                            this.loggedIn = true;
                            this.initServices(idTokenResult.claims.aid, language);
                            this.setState('info.connection', true, true);
                            this.subscribeForeignStates('*');
                            this.subscribeForeignObjects('*');
                        }
                    })
                    .catch((error) => {
                        this.log.error(error);
                    });
            } else {
                // User is signed out.
                this.destroyServices();
                this.setState('info.connection', false, true);
            }
        });
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     */
    private onUnload(callback: () => void): void {
        try {
            this.log.info('main: cleaning everything up...');
            this.destroyServices();
            firebase
                .auth()
                .signOut()
                .then(() => {
                    this.log.info('main: signed out');
                })
                .catch((error) => {
                    this.log.error('main: ' + error);
                });

            this.setState('info.connection', false, true);

            callback();
        } catch (e) {
            callback();
        }
    }

    // If you need to react to object changes, uncomment the following block and the corresponding line in the constructor.
    // You also need to subscribe to the objects with `this.subscribeObjects`, similar to `this.subscribeStates`.
    // /**
    //  * Is called if a subscribed object changes
    //  */
    private onObjectChange(id: string, obj: ioBroker.Object | null | undefined): void {
        if (!this.loggedIn) {
            return;
        }

        this.adapterService?.onObjectChange(id, obj);
        this.deviceService?.onObjectChange(id, obj);
        this.enumService?.onObjectChange(id, obj);
        this.hostService?.onObjectChange(id, obj);
        this.instanceService?.onObjectChange(id, obj);
        this.messageService?.onObjectChange(id, obj);
        this.stateService?.onObjectChange(id, obj);
    }

    /**
     * Is called if a subscribed state changes
     */
    private onStateChange(id: string, state: ioBroker.State | null | undefined): void {
        if (!this.loggedIn || state == null) {
            return;
        }

        this.deviceService?.onStateChange(id, state);
        this.messageService?.onStateChange(id, state);
        this.stateService?.onStateChange(id, state);

        if (this.deviceService?.isAnyDeviceAlive()) {
            this.hostService?.onStateChange(id, state);
        }

        if (id === 'admin.0.info.updatesJson') {
            this.adapterService?.syncAvailableVersion(state.val);
        }
    }

    private onMessage(obj: ioBroker.Message): void {
        if (typeof obj === 'object' && obj.message && this.loggedIn) {
            if (obj.command === 'send') {
                this.messageService?.send(obj);

                // Send response in callback if required
                if (obj.callback) this.sendTo(obj.from, obj.command, 'Message received', obj.callback);
            }
        }
    }

    private initServices(aid: string, lang: ioBroker.Languages): void {
        this.log.info('main: initServices');
        this.adapterService = new AdapterSyncService(this, this.app.database(DATABASES.adapter), aid, lang);
        this.deviceService = new DeviceService(this, this.app.database(), aid);
        this.enumService = new EnumSyncService(this, this.app.database(DATABASES.enum), aid, lang);
        this.hostService = new HostSyncService(this, this.app.database(DATABASES.host), aid, lang);
        this.instanceService = new InstanceSyncService(this, this.app.database(DATABASES.instance), aid, lang);
        this.locationService = new LocationService(this, this.app.database(), aid);
        this.messageService = new MessageSendService(
            this,
            this.app.database(DATABASES.message),
            firebase.storage(),
            aid,
        );
        this.stateService = new StateSyncService(this, this.app.database(DATABASES.state), aid, lang);
    }

    private destroyServices(): void {
        this.log.info('main: destroyServices');
        this.deviceService?.destroy();
        this.locationService?.destroy();
        this.stateService?.destroy();
    }
}

if (require.main !== module) {
    // Export the constructor in compact mode
    module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new Iogopro(options);
} else {
    // otherwise start the instance directly
    (() => new Iogopro())();
}
