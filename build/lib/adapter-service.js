"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdapterSyncService = void 0;
const sync_service_1 = require("./sync-service");
class AdapterSyncService extends sync_service_1.SyncService {
    constructor(adapter, database, uid, lang) {
        super(adapter.log, database, uid, 'adapter', lang);
        this.adapter = adapter;
        this.adapter.log.info('AdapterService: initializing');
        this.upload();
    }
    onObjectChange(id, obj) {
        if (obj == null) {
            this.deleteObject(id);
        }
        else if (obj.type === 'adapter') {
            super.syncObject(id, this.getAdapterObject(id, obj));
        }
    }
    upload() {
        this.adapter.getForeignObjects('*', 'adapter', (err, objects) => {
            const tmpList = new Map();
            for (const id in objects) {
                tmpList.set(id, this.getAdapterObject(id, objects[id]));
                this.adapter.log.debug('AdapterService: uploading ' + id);
            }
            this.adapter.log.info('AdapterService: uploading ' + tmpList.size + ' adapter');
            super.syncObjectList(tmpList);
        });
    }
    syncAvailableVersion(val) {
        this.adapter.log.info('AdapterService: updating adapter versions');
        const object = JSON.parse(val);
        const updates = new Map();
        for (const key in object) {
            if (object.hasOwnProperty(key) && this.idSet.has(key)) {
                updates.set(this.uid + '/adapter/data/system_adapter_' + key + '/availableVersion', object[key].availableVersion);
                updates.set(this.uid + '/adapter/data/system_adapter_' + key + '/installedVersion', object[key].installedVersion);
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
    getAdapterObject(id, obj) {
        return {
            id: id,
            name: id.replace('system.adapter.', ''),
            title: this.getTitle(obj),
            availableVersion: obj.common.version || 'unknown',
            installedVersion: obj.common.installedVersion || 'unknown',
            mode: obj.common.mode || 'unknown',
            icon: obj.common.extIcon,
            enabled: obj.common.enabled || false,
            checksum: '',
            ts: 0,
        };
    }
}
exports.AdapterSyncService = AdapterSyncService;
//# sourceMappingURL=adapter-service.js.map