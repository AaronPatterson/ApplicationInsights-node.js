import http = require("http");

import Contracts = require("../Declarations/Contracts");
import TelemetryClient = require("../Library/TelemetryClient");
import Sender = require("../Library/Sender");
import Queue = require("../Library/Channel");
import Util = require("../Library/Util");

class AutoCollectExceptions {

    public static INSTANCE: AutoCollectExceptions = null;
    public static get UNCAUGHT_EXCEPTION_HANDLER_NAME(): string { return "uncaughtException"; }
    public static get UNHANDLED_REJECTION_HANDLER_NAME(): string { return "unhandledRejection"; }

    private _exceptionListenerHandle: (reThrow: boolean, error: Error) => void;
    private _rejectionListenerHandle: (reThrow: boolean, error: Error) => void;
    private _client: TelemetryClient;
    private _isInitialized: boolean;

    constructor(client: TelemetryClient) {
        if (!!AutoCollectExceptions.INSTANCE) {
            throw new Error("Exception tracking should be configured from the applicationInsights object");
        }

        AutoCollectExceptions.INSTANCE = this;
        this._client = client;
    }

    public isInitialized() {
        return this._isInitialized;
    }

    public enable(isEnabled: boolean) {
        if (isEnabled) {
            this._isInitialized = true;
            var self = this;
            if (!this._exceptionListenerHandle) {
                var handle = (reThrow: boolean, error: Error) => {
                    this._client.trackException({ exception: error });
                    this._client.flush({ isAppCrashing: true });
                    if (reThrow) {
                        throw error;
                    }
                };
                this._exceptionListenerHandle = handle.bind(this, true);
                this._rejectionListenerHandle = handle.bind(this, false);

                process.on(AutoCollectExceptions.UNCAUGHT_EXCEPTION_HANDLER_NAME, this._exceptionListenerHandle);
                process.on(AutoCollectExceptions.UNHANDLED_REJECTION_HANDLER_NAME, this._rejectionListenerHandle);
            }

        } else {
            if (this._exceptionListenerHandle) {
                process.removeListener(AutoCollectExceptions.UNCAUGHT_EXCEPTION_HANDLER_NAME, this._exceptionListenerHandle);
                process.removeListener(AutoCollectExceptions.UNHANDLED_REJECTION_HANDLER_NAME, this._rejectionListenerHandle);
                this._exceptionListenerHandle = undefined;
                this._rejectionListenerHandle = undefined;
                delete this._exceptionListenerHandle;
                delete this._rejectionListenerHandle;
            }
        }
    }

    public dispose() {
        AutoCollectExceptions.INSTANCE = null;
        this.enable(false);
        this._isInitialized = false;
    }
}



export = AutoCollectExceptions;
