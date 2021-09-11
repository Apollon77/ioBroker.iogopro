"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncService = void 0;
const crypto_1 = __importDefault(require("crypto"));
class SyncService {
    constructor(log, database, uid, name, lang) {
        this.log = log;
        this.uid = uid;
        this.name = name;
        this.lang = lang;
        this.idSet = new Set();
        this.objectMap = new Map();
        this.database = database;
    }
    getLocalObject(id) {
        const node = this._getNode(id);
        return this.objectMap.get(node);
    }
    deleteObject(id) {
        if (!this.idSet.has(id)) {
            return;
        }
        this.log.info('SyncService: ' + id + '  deleted');
        this.idSet.delete(id);
        const node = this._getNode(id);
        this.objectMap.delete(node);
        this.database
            .ref(this.uid + '/' + this.name + '/data/' + node)
            .set(null)
            .then(() => {
            this.log.silly('SyncService: data (' + this.name + ') ' + id + ' removed successfully');
        })
            .catch((error) => {
            this.log.error('SyncService: ' + error.message);
        });
        this.database
            .ref(this.uid + '/' + this.name + '/keys/' + node)
            .set(null)
            .then(() => {
            this.log.silly('SyncService: key (' + this.name + ') ' + id + ' removed successfully');
        })
            .catch((error) => {
            this.log.error('SyncService: ' + error.message);
        });
    }
    syncObject(id, object) {
        var _a;
        this.idSet.add(id);
        this.log.info('SyncService: ' + id + '  updated');
        const node = this._getNode(id);
        object.checksum = this.generateChecksum(id, object);
        object.ts = Date.now();
        if (object.checksum !== ((_a = this.objectMap.get(node)) === null || _a === void 0 ? void 0 : _a.checksum)) {
            if (this.hasUndefinedValues(object)) {
                return;
            }
            this.objectMap.set(node, object);
            this.database
                .ref(this.uid + '/' + this.name + '/data/' + node)
                .set(object)
                .then(() => {
                this.log.silly('SyncService: data (' + this.name + ') ' + id + ' saved successfully');
            })
                .catch((error) => {
                this.log.error('SyncService: ' + error.message);
            });
            this.database
                .ref(this.uid + '/' + this.name + '/keys/' + node)
                .set(true)
                .then(() => {
                this.log.silly('SyncService: key (' + this.name + ') ' + id + ' saved successfully');
            })
                .catch((error) => {
                this.log.error('SyncService: ' + error.message);
            });
        }
    }
    hasUndefinedValues(object) {
        const entries = Object.entries(object);
        for (var i = 0; i < entries.length; i++) {
            if (entries[i][1] === undefined) {
                this.log.error('SyncService: ' + entries[i][0] + ' is missing for ' + this.name + ' ' + object.id);
                return true;
            }
        }
        return false; //!Object.entries(object).some((x) => x[1] === undefined);
    }
    syncValue(id, object) {
        const node = this._getNode(id);
        this.objectMap.set(node, object);
        object.checksum = this.generateChecksum(id, object);
        object.ts = Date.now();
        if (!this.hasUndefinedValues(object)) {
            this.database
                .ref(this.uid + '/' + this.name + '/data/' + node)
                .set(object)
                .then(() => {
                this.log.silly('SyncService: data (' + this.name + ') ' + id + ' saved successfully');
            })
                .catch((error) => {
                this.log.error('SyncService: ' + error.message);
            });
        }
    }
    getObjectFromCache(id) {
        return this.objectMap.get(this._getNode(id));
    }
    syncObjectList(objectList) {
        const localKeys = {};
        const localData = {};
        objectList.forEach((value, key) => {
            const node = this._getNode(key);
            this.idSet.add(key);
            value.checksum = this.generateChecksum(key, value);
            value.ts = Date.now();
            this.objectMap.set(node, value);
            if (!this.hasUndefinedValues(value)) {
                localData[node] = value;
                localKeys[node] = true;
            }
        });
        this.database
            .ref(this.uid + '/' + this.name + '/data')
            .set(localData)
            .then(() => {
            this.log.silly('SyncService: database initialized with ' + localData.size + ' ' + this.name + ' data');
        })
            .catch((error) => {
            this.log.error('SyncService: ' + error.message);
        });
        this.database
            .ref(this.uid + '/' + this.name + '/keys')
            .set(localKeys)
            .then(() => {
            this.log.silly('SyncService: database initialized with ' + localKeys.size + ' ' + this.name + ' keys');
        })
            .catch((error) => {
            this.log.error('SyncService: ' + error.message);
        });
    }
    getName(obj) {
        if (typeof obj.common.name === 'string') {
            return obj.common.name;
        }
        else if (typeof obj.common.name === 'object') {
            return obj.common.name[this.lang] || obj.common.name.en || '';
        }
        return '';
    }
    getTitle(obj) {
        if (typeof obj.common.titleLang === 'object') {
            return obj.common.titleLang[this.lang] || obj.common.title || '';
        }
        else {
            return obj.common.title || '';
        }
    }
    _getNode(id) {
        //replace unsupported character  . # [ ] $ /
        return id.replace(/[.#\[\]\/$]/g, '_');
    }
    generateChecksum(id, object) {
        object.ts = 0;
        object.checksum = '';
        return id + ':' + crypto_1.default.createHash('md5').update(JSON.stringify(object)).digest('hex');
    }
}
exports.SyncService = SyncService;
//# sourceMappingURL=sync-service.js.map