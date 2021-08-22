import firebase from 'firebase/app';
import crypto from 'crypto';

export interface SyncObject {
    id: string;
    checksum: string;
    ts: number;
}

export class SyncService<T extends SyncObject> {
    protected idSet: Set<string> = new Set();
    protected database: firebase.database.Database;
    private objectMap: Map<string, T> = new Map();

    constructor(
        private readonly log: ioBroker.Logger,
        database: firebase.database.Database,
        protected uid: string,
        private name: string,
    ) {
        this.database = database;
    }

    getLocalObject(id: string): T | undefined {
        const node = this._getNode(id);
        return this.objectMap.get(node);
    }

    deleteObject(id: string): void {
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

    syncObject(id: string, object: T): void {
        this.idSet.add(id);
        this.log.info('SyncService: ' + id + '  updated');

        const node = this._getNode(id);

        object.checksum = this.generateChecksum(id, object);
        object.ts = Date.now();

        if (object.checksum !== this.objectMap.get(node)?.checksum) {
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

    private checkUndefined(object: T): void {
        Object.entries(object).forEach((item) => {
            if (item[1] === undefined) {
                this.log.error('SyncService: ' + item[0] + ' is missing for ' + this.name + ' ' + object.id);
                return;
            }
        });
    }

    syncValue(id: string, object: T): void {
        const node = this._getNode(id);
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
    }

    getObjectFromCache(id: string): T | undefined {
        return this.objectMap.get(this._getNode(id));
    }

    syncObjectList(objectList: Map<string, T>): void {
        const localKeys: Record<string, boolean> = {};
        const localData: Record<string, T> = {};

        objectList.forEach((value, key) => {
            const node = this._getNode(key);
            this.idSet.add(key);
            localKeys[node] = true;
            value.checksum = this.generateChecksum(key, value);
            value.ts = Date.now();
            this.objectMap.set(node, value);
            localData[node] = value;
            this.checkUndefined(value);
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

    private _getNode(id: string): string {
        //replace unsupported character  . # [ ] $ /
        return id.replace(/[.#\[\]\/$]/g, '_');
    }

    private generateChecksum(id: string, object: T): string {
        object.ts = 0;
        object.checksum = '';
        return id + ':' + crypto.createHash('md5').update(JSON.stringify(object)).digest('hex');
    }
}