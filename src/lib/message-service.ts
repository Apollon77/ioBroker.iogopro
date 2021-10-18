import firebase from 'firebase/app';
import fs from 'fs';
import path from 'path';

export class MessageSendService {
    private userMap: Map<string, string> = new Map();
    private lastMessageTime = 0;
    private lastMessageText = '';

    constructor(
        private adapter: ioBroker.Adapter,
        private database: firebase.database.Database,
        private storage: firebase.storage.Storage,
        private uid: string,
    ) {
        this.adapter.log.info('MessageService: initializing');
        this._init();
    }

    private _init(): void {
        this.adapter.getDevices((err, objects) => {
            objects?.forEach((value) => {
                if (value.common.name) {
                    const user_name = value.common.name.toString();
                    const did = value._id.replace(this.adapter.namespace + '.', '');
                    this.userMap.set(user_name, did);
                    this.adapter.log.debug('MessageService: initialized for device ' + did + '(' + user_name + ')');
                }
            });
            this.adapter.log.info('MessageService: initialized with ' + objects?.length + ' devices');
        });
    }

    send(obj: ioBroker.Message): void {
        // filter out double messages
        const json = JSON.stringify(obj);
        if (
            this.lastMessageTime &&
            this.lastMessageText === JSON.stringify(obj) &&
            new Date().getTime() - this.lastMessageTime < 1200
        ) {
            this.adapter.log.warn(
                'MessageService: filter out message with same content [first was for ' +
                    (new Date().getTime() - this.lastMessageTime) +
                    'ms]: ' +
                    json,
            );
            return;
        }

        this.lastMessageTime = new Date().getTime();
        this.lastMessageText = json;

        if (obj.message) {
            if (typeof obj.message === 'object') {
                this.sendMessage(
                    obj.message.text,
                    obj.message.user,
                    obj.message.title || 'news',
                    obj.message.url,
                    obj.message.expiry || null,
                );
            } else {
                this.sendMessage(obj.message, null, 'news', null, null);
            }
        }
    }

    sendMessage(text: string, username: string | null, title: string, url: string | null, expiry: number | null): void {
        if (!text) {
            this.adapter.log.warn('MessageService: invalid text: null');
            return;
        }

        if (url && typeof url === 'string' && url.match(/\.(jpg|png|jpeg|bmp)$/i) && fs.existsSync(url)) {
            this.sendImage(url)
                .then((downloadurl) => {
                    this.sendMessageToUser(text, username, title, downloadurl, expiry);
                })
                .catch((error) => {
                    this.adapter.log.error('MessageService: ' + error);
                });
        } else {
            this.sendMessageToUser(text, username, title, null, expiry);
        }
    }

    private getFilteredUsers(username: string | null): Map<string, string> {
        const arrUser: Map<string, string> = new Map();

        if (username) {
            const userarray = username.replace(/\s/g, '').split(',');
            let matches = 0;
            userarray.forEach((value) => {
                if (this.userMap.get(value)) {
                    matches++;
                    arrUser.set(value, this.userMap.get(value)!);
                }
            });
            if (userarray.length !== matches) {
                this.adapter.log.warn(
                    'MessageService: ' +
                        (userarray.length - matches) +
                        ' of ' +
                        userarray.length +
                        ' recipients are unknown!',
                );
            }
            return arrUser;
        } else {
            return this.userMap;
        }
    }

    private sendMessageToUser(
        text: string,
        username: string | null,
        title: string,
        url: string | null,
        expiry: number | null,
    ): void {
        const recipients = this.getFilteredUsers(username);

        recipients.forEach((value) => {
            this._sendMessageHelper(value, text, title, url, expiry);
        });
    }

    private _sendMessageHelper(
        did: string,
        body: string,
        title: string,
        url: string | null,
        expiry: number | null,
    ): void {
        const msg = {
            title: title,
            body: body,
            url: url,
            did: did,
            expiry: expiry,
        };

        this.database
            .ref(this.uid + '/message/queue/')
            .push(msg)
            .then((_) => {
                this.adapter.log.info('MessageService: message sent succesfully');
            })
            .catch((error) => {
                this.adapter.log.error('MessageService: ' + error);
            });
    }

    private sendImage(fileName: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const storageRef = this.storage.ref();
            const retUrl: string = 'push_' + new Date().getTime().toString() + path.extname(fileName);

            const imageRef = storageRef.child('messages').child(this.uid).child(retUrl);

            const file = fs.readFileSync(fileName);

            imageRef
                .put(file)
                .then((_) => {
                    this.adapter.log.debug('MessageService: file uploaded');
                })
                .catch((error) => {
                    this.adapter.log.error('MessageService: ' + error);
                });

            const uploadTask = imageRef.put(file);

            // Register three observers:
            // 1. 'state_changed' observer, called any time the state changes
            // 2. Error observer, called on failure
            // 3. Completion observer, called on successful completion
            uploadTask.on(
                'state_changed',
                (snapshot) => {
                    // Observe state change events such as progress, pause, and resume
                    // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    this.adapter.log.debug('MessageService: upload is ' + progress + '% done');
                },
                (error) => {
                    this.adapter.log.error('Error: ' + JSON.stringify(error));
                    reject();
                },
                () => {
                    // Handle successful uploads on complete
                    uploadTask.snapshot.ref
                        .getDownloadURL()
                        .then((downloadURL) => {
                            this.adapter.log.info('MessageService: file ' + retUrl + ' uploaded');
                            resolve(downloadURL);
                        })
                        .catch((error) => {
                            this.adapter.log.error('MessageService: ' + error);
                            reject();
                        });
                },
            );
        });
    }
}
