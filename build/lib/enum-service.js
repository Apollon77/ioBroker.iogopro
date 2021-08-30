"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnumSyncService = void 0;
const sync_service_1 = require("./sync-service");
class EnumSyncService extends sync_service_1.SyncService {
    constructor(adapter, database, uid, lang) {
        super(adapter.log, database, uid, 'enum', lang);
        this.adapter = adapter;
        this.adapter.log.info('EnumService: initializing');
        this.upload();
    }
    onObjectChange(id, obj) {
        if (obj == null) {
            super.deleteObject(id);
        }
        else if (obj.type === 'enum') {
            if (id.indexOf('enum.rooms.') === 0 || id.indexOf('enum.functions.') === 0) {
                super.syncObject(id, this.getEnumObject(id, obj));
            }
        }
    }
    upload() {
        this.adapter.getForeignObjects('*', 'enum', (err, objects) => {
            this.adapter.getForeignObjects('*', 'state', (err, states) => {
                const tmpList = new Map();
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
    getEnumObject(id, obj) {
        return {
            id: id,
            name: this.getName(obj),
            members: obj.common.members,
            icon: obj.common.icon || '',
            color: obj.common.color || null,
            type: id.indexOf('enum.rooms.') === 0 ? 'room' : 'function',
            checksum: '',
            ts: 0,
        };
    }
}
exports.EnumSyncService = EnumSyncService;
//# sourceMappingURL=enum-service.js.map