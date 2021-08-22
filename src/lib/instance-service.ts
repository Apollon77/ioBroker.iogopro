import firebase from 'firebase/app';
import { SyncObject, SyncService } from './sync-service';

interface InstanceSyncObject extends SyncObject {
    name: string;
    title: string;
    loglevel: string;
    host: string;
    icon: string;
    enabled: boolean;
}

export class InstanceSyncService extends SyncService<InstanceSyncObject> {
    constructor(private adapter: ioBroker.Adapter, database: firebase.database.Database, uid: string) {
        super(adapter.log, database, uid, 'instance');

        this.adapter.log.info('InstanceService: initializing');
        this.upload();
    }

    onObjectChange(id: string, obj: ioBroker.Object | null | undefined): void {
        if (obj == null) {
            this.deleteObject(id);
        } else if (obj.type === 'instance') {
            super.syncObject(id, this.getInstanceObject(id, obj));
        }
    }

    private upload(): void {
        const tmpList: Map<string, InstanceSyncObject> = new Map();

        this.adapter.getForeignObjects('*', 'instance', (err, objects) => {
            for (const id in objects) {
                tmpList.set(id, this.getInstanceObject(id, objects[id]));
                this.adapter.log.debug('InstanceService: uploading ' + id);
            }

            this.adapter.log.info('InstanceService: uploading ' + tmpList.size + ' instances');
            super.syncObjectList(tmpList);
        });
    }

    private getInstanceObject(id: string, obj: ioBroker.Object): InstanceSyncObject {
        return {
            id: id,
            name: obj.common.name.toString(),
            title: obj.common.title || obj.common.titleLang?.en || 'notitle',
            loglevel: obj.common.loglevel || 'unknown',
            host: obj.common.host || 'unknown',
            icon: obj.common.extIcon || null,
            enabled: obj.common.enabled || false,
            checksum: '',
            ts: 0,
        };
    }
}
