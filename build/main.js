"use strict";
/*
 * Created with @iobroker/create-adapter v1.34.1
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils = __importStar(require("@iobroker/adapter-core"));
const axios_1 = __importDefault(require("axios"));
const app_1 = __importDefault(require("firebase/app"));
require("firebase/auth");
require("firebase/database");
require("firebase/functions");
require("firebase/storage");
const consts_1 = require("./consts");
const adapter_service_1 = require("./lib/adapter-service");
const device_service_1 = require("./lib/device-service");
const enum_service_1 = require("./lib/enum-service");
const host_service_1 = require("./lib/host-service");
const instance_service_1 = require("./lib/instance-service");
const location_service_1 = require("./lib/location-service");
const message_service_1 = require("./lib/message-service");
const state_service_1 = require("./lib/state-service");
class Iogopro extends utils.Adapter {
    constructor(options = {}) {
        super({
            ...options,
            name: 'iogopro',
        });
        this.app = app_1.default.initializeApp(consts_1.CONFIG);
        this.loggedIn = false;
        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        this.on('objectChange', this.onObjectChange.bind(this));
        this.on('message', this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }
    /**
     * Is called when databases are connected and adapter received configuration.
     */
    async onReady() {
        // Initialize your adapter here
        this.setState('info.connection', false, true);
        if (this.config.apikey == null) {
            this.log.warn('ApiKey is missing, please add apikey in config!');
            return;
        }
        try {
            const response = await axios_1.default.post(consts_1.URL_APIKEY, { apikey: this.config.apikey });
            if (response.status != 200) {
                this.log.error('main:' + JSON.stringify(response.statusText));
                return;
            }
            app_1.default
                .auth()
                .signInWithCustomToken(response.data.token)
                .catch((error) => {
                this.log.error('Authentication: ' + error.code + ' # ' + error.message);
                return;
            });
        }
        catch (error) {
            this.log.error('main: your apikey is invalid');
        }
        app_1.default.auth().onAuthStateChanged((user) => {
            this.loggedIn = false;
            this.log.debug('main: onAuthStateChanged');
            if (user && !user.isAnonymous) {
                user.getIdTokenResult()
                    .then((idTokenResult) => {
                    const server = idTokenResult.claims.server;
                    if (server) {
                        this.log.info('main: logged in successfully');
                        this.loggedIn = true;
                        this.initServices(idTokenResult.claims.aid);
                        this.setState('info.connection', true, true);
                        this.subscribeForeignStates('*');
                        this.subscribeForeignObjects('*');
                    }
                })
                    .catch((error) => {
                    this.log.error(error);
                });
            }
            else {
                // User is signed out.
                this.destroyServices();
                this.setState('info.connection', false, true);
            }
        });
    }
    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     */
    onUnload(callback) {
        try {
            this.log.info('main: cleaning everything up...');
            this.destroyServices();
            app_1.default
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
        }
        catch (e) {
            callback();
        }
    }
    // If you need to react to object changes, uncomment the following block and the corresponding line in the constructor.
    // You also need to subscribe to the objects with `this.subscribeObjects`, similar to `this.subscribeStates`.
    // /**
    //  * Is called if a subscribed object changes
    //  */
    onObjectChange(id, obj) {
        var _a, _b, _c, _d, _e, _f, _g;
        if (!this.loggedIn) {
            return;
        }
        (_a = this.adapterService) === null || _a === void 0 ? void 0 : _a.onObjectChange(id, obj);
        (_b = this.deviceService) === null || _b === void 0 ? void 0 : _b.onObjectChange(id, obj);
        (_c = this.enumService) === null || _c === void 0 ? void 0 : _c.onObjectChange(id, obj);
        (_d = this.hostService) === null || _d === void 0 ? void 0 : _d.onObjectChange(id, obj);
        (_e = this.instanceService) === null || _e === void 0 ? void 0 : _e.onObjectChange(id, obj);
        (_f = this.messageService) === null || _f === void 0 ? void 0 : _f.onObjectChange(id, obj);
        (_g = this.stateService) === null || _g === void 0 ? void 0 : _g.onObjectChange(id, obj);
    }
    /**
     * Is called if a subscribed state changes
     */
    onStateChange(id, state) {
        var _a, _b, _c, _d, _e, _f;
        if (!this.loggedIn || state == null) {
            return;
        }
        (_a = this.deviceService) === null || _a === void 0 ? void 0 : _a.onStateChange(id, state);
        (_b = this.messageService) === null || _b === void 0 ? void 0 : _b.onStateChange(id, state);
        (_c = this.stateService) === null || _c === void 0 ? void 0 : _c.onStateChange(id, state);
        if ((_d = this.deviceService) === null || _d === void 0 ? void 0 : _d.isAnyDeviceAlive()) {
            (_e = this.hostService) === null || _e === void 0 ? void 0 : _e.onStateChange(id, state);
        }
        if (id === 'admin.0.info.updatesJson') {
            (_f = this.adapterService) === null || _f === void 0 ? void 0 : _f.syncAvailableVersion(state.val);
        }
    }
    onMessage(obj) {
        var _a;
        if (typeof obj === 'object' && obj.message && this.loggedIn) {
            if (obj.command === 'send') {
                (_a = this.messageService) === null || _a === void 0 ? void 0 : _a.send(obj);
                // Send response in callback if required
                if (obj.callback)
                    this.sendTo(obj.from, obj.command, 'Message received', obj.callback);
            }
        }
    }
    initServices(aid) {
        this.log.info('main: initServices');
        this.adapterService = new adapter_service_1.AdapterSyncService(this, this.app.database(consts_1.DATABASES.adapter), aid);
        this.deviceService = new device_service_1.DeviceService(this, this.app.database(), aid);
        this.enumService = new enum_service_1.EnumSyncService(this, this.app.database(consts_1.DATABASES.enum), aid);
        this.hostService = new host_service_1.HostSyncService(this, this.app.database(consts_1.DATABASES.host), aid);
        this.instanceService = new instance_service_1.InstanceSyncService(this, this.app.database(consts_1.DATABASES.instance), aid);
        this.locationService = new location_service_1.LocationService(this, this.app.database(), aid);
        this.messageService = new message_service_1.MessageSendService(this, this.app.database(consts_1.DATABASES.message), app_1.default.storage(), aid);
        this.stateService = new state_service_1.StateSyncService(this, this.app.database(consts_1.DATABASES.state), aid);
    }
    destroyServices() {
        var _a, _b, _c;
        this.log.info('main: destroyServices');
        (_a = this.deviceService) === null || _a === void 0 ? void 0 : _a.destroy();
        (_b = this.locationService) === null || _b === void 0 ? void 0 : _b.destroy();
        (_c = this.stateService) === null || _c === void 0 ? void 0 : _c.destroy();
    }
}
if (require.main !== module) {
    // Export the constructor in compact mode
    module.exports = (options) => new Iogopro(options);
}
else {
    // otherwise start the instance directly
    (() => new Iogopro())();
}
//# sourceMappingURL=main.js.map