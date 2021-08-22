import firebase from 'firebase/app';
import { SyncObject, SyncService } from './sync-service';

interface AdapterSyncObject extends SyncObject {
    name: string;
    desc: string;
    title: string;
    availableVersion: string;
    installedVersion: string;
    mode: string;
    icon: string;
    enabled: boolean;
    type: string;
}

export class AdapterSyncService extends SyncService<AdapterSyncObject> {
    constructor(private adapter: ioBroker.Adapter, database: firebase.database.Database, uid: string) {
        super(adapter.log, database, uid, 'adapter');

        this.adapter.log.info('AdapterService: initializing');
        this.upload();
    }

    onObjectChange(id: string, obj: ioBroker.Object | null | undefined): void {
        if (obj == null) {
            this.deleteObject(id);
        } else if (obj.type === 'adapter') {
            super.syncObject(id, this.getAdapterObject(id, obj));
        }
    }

    private upload(): void {
        this.adapter.getForeignObjects('*', 'adapter', (err, objects) => {
            const tmpList: Map<string, AdapterSyncObject> = new Map();

            for (const id in objects) {
                tmpList.set(id, this.getAdapterObject(id, objects[id]));
                this.adapter.log.debug('AdapterService: uploading ' + id);
            }

            this.adapter.log.info('AdapterService: uploading ' + tmpList.size + ' adapter');
            super.syncObjectList(tmpList);
        });
    }

    syncAvailableVersion(val: ioBroker.StateValue): void {
        this.adapter.log.info('AdapterService: updating adapter versions');

        const object = JSON.parse(val as string);

        const updates: Map<string, string> = new Map();

        for (const key in object) {
            if (object.hasOwnProperty(key) && this.idSet.has(key)) {
                updates.set(
                    this.uid + '/adapter/data/system_adapter_' + key + '/availableVersion',
                    object[key].availableVersion,
                );
                updates.set(
                    this.uid + '/adapter/data/system_adapter_' + key + '/installedVersion',
                    object[key].installedVersion,
                );
            }
        }

        this.database
            .ref()
            .update(updates)
            .then(() => {
                this.adapter.log.debug('AdapterService: updating adapter versions done');
            })
            .catch((error) => {
                this.adapter.log.error('AdapterService: ' + error);
            });
    }

    private getAdapterObject(id: string, obj: ioBroker.Object): AdapterSyncObject {
        return {
            id: id,
            name: obj.common.name.toString(),
            desc: obj.common.desc?.en,
            title: obj.common.titleLang?.en,
            availableVersion: obj.common.version || 'unknown',
            installedVersion: obj.common.installedVersion || 'unknown',
            mode: obj.common.mode || 'unknown',
            icon: obj.common.extIcon,
            enabled: obj.common.enabled || false,
            type: obj.common.type || 'unknown',
            checksum: '',
            ts: 0,
        };
    }
}
