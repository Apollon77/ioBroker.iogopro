import firebase from 'firebase/app';
import { SyncObject, SyncService } from './sync-service';

interface EnumSyncObject extends SyncObject {
    name: string;
    members: string[];
    icon: string;
    color: string;
    type: string;
}

export class EnumSyncService extends SyncService<EnumSyncObject> {
    constructor(private adapter: ioBroker.Adapter, database: firebase.database.Database, uid: string) {
        super(adapter.log, database, uid, 'enum');

        this.adapter.log.info('EnumService: initializing');
        this.upload();
    }

    onObjectChange(id: string, obj: ioBroker.Object | null | undefined): void {
        if (obj == null) {
            super.deleteObject(id);
        } else if (obj.type === 'enum') {
            if (id.indexOf('enum.rooms.') === 0 || id.indexOf('enum.functions.') === 0) {
                super.syncObject(id, this.getEnumObject(id, obj));
            }
        }
    }

    upload(): void {
        this.adapter.getForeignObjects('*', 'enum', (err, objects) => {
            this.adapter.getForeignObjects('*', 'state', (err, states) => {
                const tmpList: Map<string, EnumSyncObject> = new Map();

                for (const id in objects) {
                    if (id.indexOf('enum.rooms.') === 0 || id.indexOf('enum.functions.') === 0) {
                        const object = this.getEnumObject(id, objects[id]);
                        for (let i = object.members.length - 1; i >= 0; i--) {
                            const checkid = object.members[i];
                            if (states === undefined || states[checkid] == null) {
                                object.members.splice(i, 1);
                            }
                        }
                        tmpList.set(id, object);
                        this.adapter.log.debug('EnumService: uploading ' + id);
                    }
                }
                this.adapter.log.info('EnumService: uploading ' + tmpList.size + ' enums');
                this.syncObjectList(tmpList);
            });
        });
    }

    private getEnumObject(id: string, obj: ioBroker.Object): EnumSyncObject {
        return {
            id: id,
            name: obj.common.name.toString(),
            members: obj.common.members,
            icon: obj.common.icon || '',
            color: obj.common.color || null,
            type: id.indexOf('enum.rooms.') === 0 ? 'room' : 'function',
            checksum: '',
            ts: 0,
        };
    }
}
