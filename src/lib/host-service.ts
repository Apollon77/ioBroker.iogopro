import firebase from 'firebase/app';
import { SyncObject, SyncService } from './sync-service';

interface HostSyncObject extends SyncObject {
    name: string;
    installedVersion: string;
    hostname: string;
    platform: string;
    totalmem: string;
    type: string;
    alive: boolean;
}

export class HostSyncService extends SyncService<HostSyncObject> {
    constructor(
        private adapter: ioBroker.Adapter,
        database: firebase.database.Database,
        uid: string,
        lang: ioBroker.Languages,
    ) {
        super(adapter.log, database, uid, 'host', lang);

        this.adapter.log.info('HostService: initializing');
        this.upload();
    }

    onObjectChange(id: string, obj: ioBroker.Object | null | undefined): void {
        if (obj == null) {
            super.deleteObject(id);
        } else if (obj.type === 'host') {
            const alive: boolean = this.getLocalObject(id)?.alive || false;
            super.syncObject(id, this.getHostObject(id, obj, alive));
            this.adapter.log.info('HostService: ' + id + '  updated');
        }
    }

    onStateChange(id: string, state: ioBroker.State): void {
        if (id.indexOf('system.host.*') === 0 && id.substr(id.lastIndexOf('.') + 1) == 'alive') {
            const objId = id.substr(0, id.lastIndexOf('.'));
            if (!this.idSet.has(objId)) {
                this.adapter.log.warn('HostService: ' + objId + '  is unknown. Nothing updated');
                return;
            }
            const obj = this.getLocalObject(objId);

            if (obj) {
                obj.alive = state.val == 'true';
                super.syncObject(objId, obj);
                this.adapter.log.debug('HostService: ' + id + '  updated (alive)');
            } else {
                this.adapter.log.warn('HostService: ' + objId + '  is unknown. Nothing updated');
                return;
            }
        }
    }

    upload(): void {
        const tmpList: Map<string, HostSyncObject> = new Map();

        this.adapter.getForeignObjects('*', 'host', (err, objects) => {
            this.adapter.getForeignStates('system.host.*', (err, states) => {
                for (const id in states) {
                    if (objects && id.endsWith('.alive')) {
                        const objId = id.substr(0, id.lastIndexOf('.'));
                        if (objects[objId] != undefined) {
                            const alive: boolean = states[id]?.val == true;
                            const object = this.getHostObject(objId, objects[objId], alive);

                            tmpList.set(objId, object);
                        }
                    }
                }

                this.adapter.log.info('HostService: uploading ' + tmpList.size + ' hosts');
                super.syncObjectList(tmpList);
            });
        });
    }

    private getHostObject(id: string, obj: ioBroker.Object, alive: boolean): HostSyncObject {
        return {
            id: id,
            name: id.replace('system.host.', ''),
            installedVersion: obj.common.installedVersion || 'null',
            hostname: obj.common.hostname || 'null',
            platform: obj.native.os.platform || 'null',
            totalmem: obj.native.hardware.totalmem || 0,
            type: obj.common.type,
            alive: alive || false,
            checksum: '',
            ts: 0,
        };
    }
}
