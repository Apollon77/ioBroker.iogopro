"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstanceSyncService = void 0;
const sync_service_1 = require("./sync-service");
class InstanceSyncService extends sync_service_1.SyncService {
    constructor(adapter, database, uid) {
        super(adapter.log, database, uid, 'instance');
        this.adapter = adapter;
        this.adapter.log.info('InstanceService: initializing');
        this.upload();
    }
    onObjectChange(id, obj) {
        if (obj == null) {
            this.deleteObject(id);
        }
        else if (obj.type === 'instance') {
            super.syncObject(id, this.getInstanceObject(id, obj));
        }
    }
    upload() {
        const tmpList = new Map();
        this.adapter.getForeignObjects('*', 'instance', (err, objects) => {
            for (const id in objects) {
                tmpList.set(id, this.getInstanceObject(id, objects[id]));
                this.adapter.log.debug('InstanceService: uploading ' + id);
            }
            this.adapter.log.info('InstanceService: uploading ' + tmpList.size + ' instances');
            super.syncObjectList(tmpList);
        });
    }
    getInstanceObject(id, obj) {
        var _a;
        return {
            id: id,
            name: obj.common.name.toString(),
            title: obj.common.title || ((_a = obj.common.titleLang) === null || _a === void 0 ? void 0 : _a.en) || 'notitle',
            loglevel: obj.common.loglevel || 'unknown',
            host: obj.common.host || 'unknown',
            icon: obj.common.extIcon || null,
            enabled: obj.common.enabled || false,
            checksum: '',
            ts: 0,
        };
    }
}
exports.InstanceSyncService = InstanceSyncService;
//# sourceMappingURL=instance-service.js.map