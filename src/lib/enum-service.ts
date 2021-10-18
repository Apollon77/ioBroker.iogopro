import firebase from 'firebase/app';
import { SyncObject, SyncService } from './sync-service';

interface EnumSyncObject extends SyncObject {
    name: string;
    members: string[];
    icon: string;
    color: string;
    type: string;
    admin: boolean;
}

export class EnumSyncService extends SyncService<EnumSyncObject> {
    constructor(
        private adapter: ioBroker.Adapter,
        database: firebase.database.Database,
        uid: string,
        lang: ioBroker.Languages,
        private blockedEnumIds: string[],
        private adminEnumIds: string[],
    ) {
        super(adapter.log, database, uid, 'enum', lang);

        this.adapter.log.info('EnumService: initializing');
        this.adapter.log.debug('EnumService: blocked enums: ' + JSON.stringify(this.blockedEnumIds));
        this.adapter.log.debug('EnumService: admin-only enums: ' + JSON.stringify(this.adminEnumIds));

        this.upload();
    }

    onObjectChange(id: string, obj: ioBroker.Object | null | undefined): void {
        if (obj == null) {
            super.deleteObject(id);
        } else if (obj.type === 'enum') {
            if (
                !this.blockedEnumIds.includes(id) &&
                (id.indexOf('enum.rooms.') === 0 || id.indexOf('enum.functions.') === 0)
            ) {
                super.syncObject(id, this.getEnumObject(id, obj));
            }
        }
    }

    upload(): void {
        this.adapter.getForeignObjects('*', 'enum', (err, objects) => {
            this.adapter.getForeignObjects('*', 'state', (err, states) => {
                const tmpList: Map<string, EnumSyncObject> = new Map();

                for (const id in objects) {
                    if (
                        !this.blockedEnumIds.includes(id) &&
                        (id.indexOf('enum.rooms.') === 0 || id.indexOf('enum.functions.') === 0)
                    ) {
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
            name: this.getName(obj),
            members: obj.common.members,
            icon: obj.common.icon || '',
            color: obj.common.color || null,
            type: id.indexOf('enum.rooms.') === 0 ? 'room' : 'function',
            admin: this.adminEnumIds.includes(id),
            checksum: '',
            ts: 0,
        };
    }
}
