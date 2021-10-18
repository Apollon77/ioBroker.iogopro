"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnumSyncService = void 0;
const sync_service_1 = require("./sync-service");
class EnumSyncService extends sync_service_1.SyncService {
    constructor(adapter, database, uid, lang, blockedEnumIds, adminEnumIds) {
        super(adapter.log, database, uid, 'enum', lang);
        this.adapter = adapter;
        this.blockedEnumIds = blockedEnumIds;
        this.adminEnumIds = adminEnumIds;
        this.adapter.log.info('EnumService: initializing');
        this.adapter.log.debug('EnumService: blocked enums: ' + JSON.stringify(this.blockedEnumIds));
        this.adapter.log.debug('EnumService: admin-only enums: ' + JSON.stringify(this.adminEnumIds));
        this.upload();
    }
    onObjectChange(id, obj) {
        if (obj == null) {
            super.deleteObject(id);
        }
        else if (obj.type === 'enum') {
            if (!this.blockedEnumIds.includes(id) &&
                (id.indexOf('enum.rooms.') === 0 || id.indexOf('enum.functions.') === 0)) {
                super.syncObject(id, this.getEnumObject(id, obj));
            }
        }
    }
    upload() {
        this.adapter.getForeignObjects('*', 'enum', (err, objects) => {
            this.adapter.getForeignObjects('*', 'state', (err, states) => {
                const tmpList = new Map();
                for (const id in objects) {
                    if (!this.blockedEnumIds.includes(id) &&
                        (id.indexOf('enum.rooms.') === 0 || id.indexOf('enum.functions.') === 0)) {
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
            admin: this.adminEnumIds.includes(id),
            checksum: '',
            ts: 0,
        };
    }
}
exports.EnumSyncService = EnumSyncService;
//# sourceMappingURL=enum-service.js.map