/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
/// <reference path="./thenable.ts" />
'use strict';
var { setTimeout, clearTimeout, setImmediate } = require("sdk/timers");
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
var Is = require("./is");
var messages_1 = require("./messages");
exports.RequestType = messages_1.RequestType;
exports.RequestType0 = messages_1.RequestType0;
exports.RequestType1 = messages_1.RequestType1;
exports.RequestType2 = messages_1.RequestType2;
exports.RequestType3 = messages_1.RequestType3;
exports.RequestType4 = messages_1.RequestType4;
exports.RequestType5 = messages_1.RequestType5;
exports.RequestType6 = messages_1.RequestType6;
exports.RequestType7 = messages_1.RequestType7;
exports.RequestType8 = messages_1.RequestType8;
exports.RequestType9 = messages_1.RequestType9;
exports.ResponseError = messages_1.ResponseError;
exports.ErrorCodes = messages_1.ErrorCodes;
exports.NotificationType = messages_1.NotificationType;
exports.NotificationType0 = messages_1.NotificationType0;
exports.NotificationType1 = messages_1.NotificationType1;
exports.NotificationType2 = messages_1.NotificationType2;
exports.NotificationType3 = messages_1.NotificationType3;
exports.NotificationType4 = messages_1.NotificationType4;
exports.NotificationType5 = messages_1.NotificationType5;
exports.NotificationType6 = messages_1.NotificationType6;
exports.NotificationType7 = messages_1.NotificationType7;
exports.NotificationType8 = messages_1.NotificationType8;
exports.NotificationType9 = messages_1.NotificationType9;
var messageReader_1 = require("./messageReader");
exports.MessageReader = messageReader_1.MessageReader;
exports.StreamMessageReader = messageReader_1.StreamMessageReader;
exports.IPCMessageReader = messageReader_1.IPCMessageReader;
exports.SocketMessageReader = messageReader_1.SocketMessageReader;
var messageWriter_1 = require("./messageWriter");
exports.MessageWriter = messageWriter_1.MessageWriter;
exports.StreamMessageWriter = messageWriter_1.StreamMessageWriter;
exports.IPCMessageWriter = messageWriter_1.IPCMessageWriter;
exports.SocketMessageWriter = messageWriter_1.SocketMessageWriter;
var events_1 = require("./events");
exports.Disposable = events_1.Disposable;
exports.Event = events_1.Event;
exports.Emitter = events_1.Emitter;
var cancellation_1 = require("./cancellation");
exports.CancellationTokenSource = cancellation_1.CancellationTokenSource;
exports.CancellationToken = cancellation_1.CancellationToken;
var linkedMap_1 = require("./linkedMap");
var CancelNotification;
(function (CancelNotification) {
    CancelNotification.type = new messages_1.NotificationType('$/cancelRequest');
})(CancelNotification || (CancelNotification = {}));
var Trace;
(function (Trace) {
    Trace[Trace["Off"] = 0] = "Off";
    Trace[Trace["Messages"] = 1] = "Messages";
    Trace[Trace["Verbose"] = 2] = "Verbose";
})(Trace = exports.Trace || (exports.Trace = {}));
(function (Trace) {
    function fromString(value) {
        value = value.toLowerCase();
        switch (value) {
            case 'off':
                return Trace.Off;
            case 'messages':
                return Trace.Messages;
            case 'verbose':
                return Trace.Verbose;
            default:
                return Trace.Off;
        }
    }
    Trace.fromString = fromString;
    function toString(value) {
        switch (value) {
            case Trace.Off:
                return 'off';
            case Trace.Messages:
                return 'messages';
            case Trace.Verbose:
                return 'verbose';
            default:
                return 'off';
        }
    }
    Trace.toString = toString;
})(Trace = exports.Trace || (exports.Trace = {}));
var SetTraceNotification;
(function (SetTraceNotification) {
    SetTraceNotification.type = new messages_1.NotificationType('$/setTraceNotification');
})(SetTraceNotification = exports.SetTraceNotification || (exports.SetTraceNotification = {}));
var LogTraceNotification;
(function (LogTraceNotification) {
    LogTraceNotification.type = new messages_1.NotificationType('$/logTraceNotification');
})(LogTraceNotification = exports.LogTraceNotification || (exports.LogTraceNotification = {}));
var ConnectionErrors;
(function (ConnectionErrors) {
    /**
     * The connection is closed.
     */
    ConnectionErrors[ConnectionErrors["Closed"] = 1] = "Closed";
    /**
     * The connection got disposed.
     */
    ConnectionErrors[ConnectionErrors["Disposed"] = 2] = "Disposed";
    /**
     * The connection is already in listening mode.
     */
    ConnectionErrors[ConnectionErrors["AlreadyListening"] = 3] = "AlreadyListening";
})(ConnectionErrors = exports.ConnectionErrors || (exports.ConnectionErrors = {}));
var ConnectionError = /** @class */ (function (_super) {
    __extends(ConnectionError, _super);
    function ConnectionError(code, message) {
        var _this = _super.call(this, message) || this;
        _this.code = code;
        Object.setPrototypeOf(_this, ConnectionError.prototype);
        return _this;
    }
    return ConnectionError;
}(Error));
exports.ConnectionError = ConnectionError;
var ConnectionStrategy;
(function (ConnectionStrategy) {
    function is(value) {
        var candidate = value;
        return candidate && Is.func(candidate.cancelUndispatched);
    }
    ConnectionStrategy.is = is;
})(ConnectionStrategy = exports.ConnectionStrategy || (exports.ConnectionStrategy = {}));
var ConnectionState;
(function (ConnectionState) {
    ConnectionState[ConnectionState["New"] = 1] = "New";
    ConnectionState[ConnectionState["Listening"] = 2] = "Listening";
    ConnectionState[ConnectionState["Closed"] = 3] = "Closed";
    ConnectionState[ConnectionState["Disposed"] = 4] = "Disposed";
})(ConnectionState || (ConnectionState = {}));
function _createMessageConnection(messageReader, messageWriter, logger, strategy) {
    var sequenceNumber = 0;
    var notificationSquenceNumber = 0;
    var unknownResponseSquenceNumber = 0;
    var version = '2.0';
    var starRequestHandler = undefined;
    var requestHandlers = Object.create(null);
    var starNotificationHandler = undefined;
    var notificationHandlers = Object.create(null);
    var timer;
    var messageQueue = new linkedMap_1.LinkedMap();
    var responsePromises = Object.create(null);
    var requestTokens = Object.create(null);
    var trace = Trace.Off;
    var tracer;
    var state = ConnectionState.New;
    var errorEmitter = new events_1.Emitter();
    var closeEmitter = new events_1.Emitter();
    var unhandledNotificationEmitter = new events_1.Emitter();
    var disposeEmitter = new events_1.Emitter();
    function createRequestQueueKey(id) {
        return 'req-' + id.toString();
    }
    function createResponseQueueKey(id) {
        if (id === null) {
            return 'res-unknown-' + (++unknownResponseSquenceNumber).toString();
        }
        else {
            return 'res-' + id.toString();
        }
    }
    function createNotificationQueueKey() {
        return 'not-' + (++notificationSquenceNumber).toString();
    }
    function addMessageToQueue(queue, message) {
        if (messages_1.isRequestMessage(message)) {
            queue.set(createRequestQueueKey(message.id), message);
        }
        else if (messages_1.isResponseMessage(message)) {
            queue.set(createResponseQueueKey(message.id), message);
        }
        else {
            queue.set(createNotificationQueueKey(), message);
        }
    }
    function cancelUndispatched(_message) {
        return undefined;
    }
    function isListening() {
        return state === ConnectionState.Listening;
    }
    function isClosed() {
        return state === ConnectionState.Closed;
    }
    function isDisposed() {
        return state === ConnectionState.Disposed;
    }
    function closeHandler() {
        if (state === ConnectionState.New || state === ConnectionState.Listening) {
            state = ConnectionState.Closed;
            closeEmitter.fire(undefined);
        }
        // If the connection is disposed don't sent close events.
    }
    ;
    function readErrorHandler(error) {
        errorEmitter.fire([error, undefined, undefined]);
    }
    function writeErrorHandler(data) {
        errorEmitter.fire(data);
    }
    messageReader.onClose(closeHandler);
    messageReader.onError(readErrorHandler);
    messageWriter.onClose(closeHandler);
    messageWriter.onError(writeErrorHandler);
    function triggerMessageQueue() {
        if (timer || messageQueue.size === 0) {
            return;
        }
        timer = setImmediate(function () {
            timer = undefined;
            processMessageQueue();
        });
    }
    function processMessageQueue() {
        if (messageQueue.size === 0) {
            return;
        }
        var message = messageQueue.shift();
        try {
            if (messages_1.isRequestMessage(message)) {
                handleRequest(message);
            }
            else if (messages_1.isNotificationMessage(message)) {
                handleNotification(message);
            }
            else if (messages_1.isResponseMessage(message)) {
                handleResponse(message);
            }
            else {
                handleInvalidMessage(message);
            }
        }
        finally {
            triggerMessageQueue();
        }
    }
    var callback = function (message) {
        try {
            // We have recevied a cancellation message. Check if the message is still in the queue
            // and cancel it if allowed to do so.
            if (messages_1.isNotificationMessage(message) && message.method === CancelNotification.type.method) {
                var key = createRequestQueueKey(message.params.id);
                var toCancel = messageQueue.get(key);
                if (messages_1.isRequestMessage(toCancel)) {
                    var response = strategy && strategy.cancelUndispatched ? strategy.cancelUndispatched(toCancel, cancelUndispatched) : cancelUndispatched(toCancel);
                    if (response && (response.error !== void 0 || response.result !== void 0)) {
                        messageQueue.delete(key);
                        response.id = toCancel.id;
                        traceSendingResponse(response, message.method, Date.now());
                        messageWriter.write(response);
                        return;
                    }
                }
            }
            addMessageToQueue(messageQueue, message);
        }
        finally {
            triggerMessageQueue();
        }
    };
    function handleRequest(requestMessage) {
        if (isDisposed()) {
            // we return here silently since we fired an event when the
            // connection got disposed.
            return;
        }
        function reply(resultOrError, method, startTime) {
            var message = {
                jsonrpc: version,
                id: requestMessage.id
            };
            if (resultOrError instanceof messages_1.ResponseError) {
                message.error = resultOrError.toJson();
            }
            else {
                message.result = resultOrError === void 0 ? null : resultOrError;
            }
            traceSendingResponse(message, method, startTime);
            messageWriter.write(message);
        }
        function replyError(error, method, startTime) {
            var message = {
                jsonrpc: version,
                id: requestMessage.id,
                error: error.toJson()
            };
            traceSendingResponse(message, method, startTime);
            messageWriter.write(message);
        }
        function replySuccess(result, method, startTime) {
            // The JSON RPC defines that a response must either have a result or an error
            // So we can't treat undefined as a valid response result.
            if (result === void 0) {
                result = null;
            }
            var message = {
                jsonrpc: version,
                id: requestMessage.id,
                result: result
            };
            traceSendingResponse(message, method, startTime);
            messageWriter.write(message);
        }
        traceReceivedRequest(requestMessage);
        var element = requestHandlers[requestMessage.method];
        var type;
        var requestHandler;
        if (element) {
            type = element.type;
            requestHandler = element.handler;
        }
        var startTime = Date.now();
        if (requestHandler || starRequestHandler) {
            var cancellationSource = new cancellation_1.CancellationTokenSource();
            var tokenKey_1 = String(requestMessage.id);
            requestTokens[tokenKey_1] = cancellationSource;
            try {
                var handlerResult = void 0;
                if (requestMessage.params === void 0 || (type !== void 0 && type.numberOfParams === 0)) {
                    handlerResult = requestHandler
                        ? requestHandler(cancellationSource.token)
                        : starRequestHandler(requestMessage.method, cancellationSource.token);
                }
                else if (Is.array(requestMessage.params) && (type === void 0 || type.numberOfParams > 1)) {
                    handlerResult = requestHandler
                        ? requestHandler.apply(void 0, requestMessage.params.concat([cancellationSource.token])) : starRequestHandler.apply(void 0, [requestMessage.method].concat(requestMessage.params, [cancellationSource.token]));
                }
                else {
                    handlerResult = requestHandler
                        ? requestHandler(requestMessage.params, cancellationSource.token)
                        : starRequestHandler(requestMessage.method, requestMessage.params, cancellationSource.token);
                }
                var promise = handlerResult;
                if (!handlerResult) {
                    delete requestTokens[tokenKey_1];
                    replySuccess(handlerResult, requestMessage.method, startTime);
                }
                else if (promise.then) {
                    promise.then(function (resultOrError) {
                        delete requestTokens[tokenKey_1];
                        reply(resultOrError, requestMessage.method, startTime);
                    }, function (error) {
                        delete requestTokens[tokenKey_1];
                        if (error instanceof messages_1.ResponseError) {
                            replyError(error, requestMessage.method, startTime);
                        }
                        else if (error && Is.string(error.message)) {
                            replyError(new messages_1.ResponseError(messages_1.ErrorCodes.InternalError, "Request " + requestMessage.method + " failed with message: " + error.message), requestMessage.method, startTime);
                        }
                        else {
                            replyError(new messages_1.ResponseError(messages_1.ErrorCodes.InternalError, "Request " + requestMessage.method + " failed unexpectedly without providing any details."), requestMessage.method, startTime);
                        }
                    });
                }
                else {
                    delete requestTokens[tokenKey_1];
                    reply(handlerResult, requestMessage.method, startTime);
                }
            }
            catch (error) {
                delete requestTokens[tokenKey_1];
                if (error instanceof messages_1.ResponseError) {
                    reply(error, requestMessage.method, startTime);
                }
                else if (error && Is.string(error.message)) {
                    replyError(new messages_1.ResponseError(messages_1.ErrorCodes.InternalError, "Request " + requestMessage.method + " failed with message: " + error.message), requestMessage.method, startTime);
                }
                else {
                    replyError(new messages_1.ResponseError(messages_1.ErrorCodes.InternalError, "Request " + requestMessage.method + " failed unexpectedly without providing any details."), requestMessage.method, startTime);
                }
            }
        }
        else {
            replyError(new messages_1.ResponseError(messages_1.ErrorCodes.MethodNotFound, "Unhandled method " + requestMessage.method), requestMessage.method, startTime);
        }
    }
    function handleResponse(responseMessage) {
        if (isDisposed()) {
            // See handle request.
            return;
        }
        if (responseMessage.id === null) {
            if (responseMessage.error) {
                logger.error("Received response message without id: Error is: \n" + JSON.stringify(responseMessage.error, undefined, 4));
            }
            else {
                logger.error("Received response message without id. No further error information provided.");
            }
        }
        else {
            var key = String(responseMessage.id);
            var responsePromise = responsePromises[key];
            traceReceivedResponse(responseMessage, responsePromise);
            if (responsePromise) {
                delete responsePromises[key];
                try {
                    if (responseMessage.error) {
                        var error = responseMessage.error;
                        responsePromise.reject(new messages_1.ResponseError(error.code, error.message, error.data));
                    }
                    else if (responseMessage.result !== void 0) {
                        responsePromise.resolve(responseMessage.result);
                    }
                    else {
                        throw new Error('Should never happen.');
                    }
                }
                catch (error) {
                    if (error.message) {
                        logger.error("Response handler '" + responsePromise.method + "' failed with message: " + error.message);
                    }
                    else {
                        logger.error("Response handler '" + responsePromise.method + "' failed unexpectedly.");
                    }
                }
            }
        }
    }
    function handleNotification(message) {
        if (isDisposed()) {
            // See handle request.
            return;
        }
        var type = undefined;
        var notificationHandler;
        if (message.method === CancelNotification.type.method) {
            notificationHandler = function (params) {
                var id = params.id;
                var source = requestTokens[String(id)];
                if (source) {
                    source.cancel();
                }
            };
        }
        else {
            var element = notificationHandlers[message.method];
            if (element) {
                notificationHandler = element.handler;
                type = element.type;
            }
        }
        if (notificationHandler || starNotificationHandler) {
            try {
                traceReceivedNotification(message);
                if (message.params === void 0 || (type !== void 0 && type.numberOfParams === 0)) {
                    notificationHandler ? notificationHandler() : starNotificationHandler(message.method);
                }
                else if (Is.array(message.params) && (type === void 0 || type.numberOfParams > 1)) {
                    notificationHandler ? notificationHandler.apply(void 0, message.params) : starNotificationHandler.apply(void 0, [message.method].concat(message.params));
                }
                else {
                    notificationHandler ? notificationHandler(message.params) : starNotificationHandler(message.method, message.params);
                }
            }
            catch (error) {
                if (error.message) {
                    logger.error("Notification handler '" + message.method + "' failed with message: " + error.message);
                }
                else {
                    logger.error("Notification handler '" + message.method + "' failed unexpectedly.");
                }
            }
        }
        else {
            unhandledNotificationEmitter.fire(message);
        }
    }
    function handleInvalidMessage(message) {
        if (!message) {
            logger.error('Received empty message.');
            return;
        }
        logger.error("Received message which is neither a response nor a notification message:\n" + JSON.stringify(message, null, 4));
        // Test whether we find an id to reject the promise
        var responseMessage = message;
        if (Is.string(responseMessage.id) || Is.number(responseMessage.id)) {
            var key = String(responseMessage.id);
            var responseHandler = responsePromises[key];
            if (responseHandler) {
                responseHandler.reject(new Error('The received response has neither a result nor an error property.'));
            }
        }
    }
    function traceSendingRequest(message) {
        if (trace === Trace.Off || !tracer) {
            return;
        }
        var data = undefined;
        if (trace === Trace.Verbose && message.params) {
            data = "Params: " + JSON.stringify(message.params, null, 4) + "\n\n";
        }
        tracer.log("Sending request '" + message.method + " - (" + message.id + ")'.", data);
    }
    function traceSendNotification(message) {
        if (trace === Trace.Off || !tracer) {
            return;
        }
        var data = undefined;
        if (trace === Trace.Verbose) {
            if (message.params) {
                data = "Params: " + JSON.stringify(message.params, null, 4) + "\n\n";
            }
            else {
                data = 'No parameters provided.\n\n';
            }
        }
        tracer.log("Sending notification '" + message.method + "'.", data);
    }
    function traceSendingResponse(message, method, startTime) {
        if (trace === Trace.Off || !tracer) {
            return;
        }
        var data = undefined;
        if (trace === Trace.Verbose) {
            if (message.error && message.error.data) {
                data = "Error data: " + JSON.stringify(message.error.data, null, 4) + "\n\n";
            }
            else {
                if (message.result) {
                    data = "Result: " + JSON.stringify(message.result, null, 4) + "\n\n";
                }
                else if (message.error === void 0) {
                    data = 'No result returned.\n\n';
                }
            }
        }
        tracer.log("Sending response '" + method + " - (" + message.id + ")'. Processing request took " + (Date.now() - startTime) + "ms");
    }
    function traceReceivedRequest(message) {
        if (trace === Trace.Off || !tracer) {
            return;
        }
        var data = undefined;
        if (trace === Trace.Verbose && message.params) {
            data = "Params: " + JSON.stringify(message.params, null, 4) + "\n\n";
        }
        tracer.log("Received request '" + message.method + " - (" + message.id + ")'.", data);
    }
    function traceReceivedNotification(message) {
        if (trace === Trace.Off || !tracer || message.method === LogTraceNotification.type.method) {
            return;
        }
        var data = undefined;
        if (trace === Trace.Verbose) {
            if (message.params) {
                data = "Params: " + JSON.stringify(message.params, null, 4) + "\n\n";
            }
            else {
                data = 'No parameters provided.\n\n';
            }
        }
        tracer.log("Received notification '" + message.method + "'.", data);
    }
    function traceReceivedResponse(message, responsePromise) {
        if (trace === Trace.Off || !tracer) {
            return;
        }
        var data = undefined;
        if (trace === Trace.Verbose) {
            if (message.error && message.error.data) {
                data = "Error data: " + JSON.stringify(message.error.data, null, 4) + "\n\n";
            }
            else {
                if (message.result) {
                    data = "Result: " + JSON.stringify(message.result, null, 4) + "\n\n";
                }
                else if (message.error === void 0) {
                    data = 'No result returned.\n\n';
                }
            }
        }
        if (responsePromise) {
            var error = message.error ? " Request failed: " + message.error.message + " (" + message.error.code + ")." : '';
            tracer.log("Received response '" + responsePromise.method + " - (" + message.id + ")' in " + (Date.now() - responsePromise.timerStart) + "ms." + error, data);
        }
        else {
            tracer.log("Received response " + message.id + " without active response promise.", data);
        }
    }
    function throwIfClosedOrDisposed() {
        if (isClosed()) {
            throw new ConnectionError(ConnectionErrors.Closed, 'Connection is closed.');
        }
        if (isDisposed()) {
            throw new ConnectionError(ConnectionErrors.Disposed, 'Connection is disposed.');
        }
    }
    function throwIfListening() {
        if (isListening()) {
            throw new ConnectionError(ConnectionErrors.AlreadyListening, 'Connection is already listening');
        }
    }
    function throwIfNotListening() {
        if (!isListening()) {
            throw new Error('Call listen() first.');
        }
    }
    function undefinedToNull(param) {
        if (param === void 0) {
            return null;
        }
        else {
            return param;
        }
    }
    function computeMessageParams(type, params) {
        var result;
        var numberOfParams = type.numberOfParams;
        switch (numberOfParams) {
            case 0:
                result = null;
                break;
            case 1:
                result = undefinedToNull(params[0]);
                break;
            default:
                result = [];
                for (var i = 0; i < params.length && i < numberOfParams; i++) {
                    result.push(undefinedToNull(params[i]));
                }
                if (params.length < numberOfParams) {
                    for (var i = params.length; i < numberOfParams; i++) {
                        result.push(null);
                    }
                }
                break;
        }
        return result;
    }
    var connection = {
        sendNotification: function (type) {
            var params = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                params[_i - 1] = arguments[_i];
            }
            throwIfClosedOrDisposed();
            var method;
            var messageParams;
            if (Is.string(type)) {
                method = type;
                switch (params.length) {
                    case 0:
                        messageParams = null;
                        break;
                    case 1:
                        messageParams = params[0];
                        break;
                    default:
                        messageParams = params;
                        break;
                }
            }
            else {
                method = type.method;
                messageParams = computeMessageParams(type, params);
            }
            var notificationMessage = {
                jsonrpc: version,
                method: Is.string(type) ? type : type.method,
                params: messageParams
            };
            traceSendNotification(notificationMessage);
            messageWriter.write(notificationMessage);
        },
        onNotification: function (type, handler) {
            throwIfClosedOrDisposed();
            if (Is.func(type)) {
                starNotificationHandler = type;
            }
            else if (handler) {
                if (Is.string(type)) {
                    notificationHandlers[type] = { type: undefined, handler: handler };
                }
                else {
                    notificationHandlers[type.method] = { type: type, handler: handler };
                }
            }
        },
        sendRequest: function (type) {
            var params = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                params[_i - 1] = arguments[_i];
            }
            throwIfClosedOrDisposed();
            throwIfNotListening();
            var method;
            var messageParams;
            var token = undefined;
            if (Is.string(type)) {
                method = type;
                switch (params.length) {
                    case 0:
                        messageParams = null;
                        break;
                    case 1:
                        // The cancellation token is optional so it can also be undefined.
                        if (cancellation_1.CancellationToken.is(params[0])) {
                            messageParams = null;
                            token = params[0];
                        }
                        else {
                            messageParams = undefinedToNull(params[0]);
                        }
                        break;
                    default:
                        var last = params.length - 1;
                        if (cancellation_1.CancellationToken.is(params[last])) {
                            token = params[last];
                            if (params.length === 2) {
                                messageParams = undefinedToNull(params[0]);
                            }
                            else {
                                messageParams = params.slice(0, last).map(function (value) { return undefinedToNull(value); });
                            }
                        }
                        else {
                            messageParams = params.map(function (value) { return undefinedToNull(value); });
                        }
                        break;
                }
            }
            else {
                method = type.method;
                messageParams = computeMessageParams(type, params);
                var numberOfParams = type.numberOfParams;
                token = cancellation_1.CancellationToken.is(params[numberOfParams]) ? params[numberOfParams] : undefined;
            }
            var id = sequenceNumber++;
            var result = new Promise(function (resolve, reject) {
                var requestMessage = {
                    jsonrpc: version,
                    id: id,
                    method: method,
                    params: messageParams
                };
                var responsePromise = { method: method, timerStart: Date.now(), resolve: resolve, reject: reject };
                traceSendingRequest(requestMessage);
                try {
                    messageWriter.write(requestMessage);
                }
                catch (e) {
                    // Writing the message failed. So we need to reject the promise.
                    responsePromise.reject(new messages_1.ResponseError(messages_1.ErrorCodes.MessageWriteError, e.message ? e.message : 'Unknown reason'));
                    responsePromise = null;
                }
                if (responsePromise) {
                    responsePromises[String(id)] = responsePromise;
                }
            });
            if (token) {
                token.onCancellationRequested(function () {
                    connection.sendNotification(CancelNotification.type, { id: id });
                });
            }
            return result;
        },
        onRequest: function (type, handler) {
            throwIfClosedOrDisposed();
            if (Is.func(type)) {
                starRequestHandler = type;
            }
            else if (handler) {
                if (Is.string(type)) {
                    requestHandlers[type] = { type: undefined, handler: handler };
                }
                else {
                    requestHandlers[type.method] = { type: type, handler: handler };
                }
            }
        },
        trace: function (_value, _tracer, sendNotification) {
            if (sendNotification === void 0) { sendNotification = false; }
            trace = _value;
            if (trace === Trace.Off) {
                tracer = undefined;
            }
            else {
                tracer = _tracer;
            }
            if (sendNotification && !isClosed() && !isDisposed()) {
                connection.sendNotification(SetTraceNotification.type, { value: Trace.toString(_value) });
            }
        },
        onError: errorEmitter.event,
        onClose: closeEmitter.event,
        onUnhandledNotification: unhandledNotificationEmitter.event,
        onDispose: disposeEmitter.event,
        dispose: function () {
            if (isDisposed()) {
                return;
            }
            state = ConnectionState.Disposed;
            disposeEmitter.fire(undefined);
            var error = new Error('Connection got disposed.');
            Object.keys(responsePromises).forEach(function (key) {
                responsePromises[key].reject(error);
            });
            responsePromises = Object.create(null);
            requestTokens = Object.create(null);
            messageQueue = new linkedMap_1.LinkedMap();
            // Test for backwards compatibility
            if (Is.func(messageWriter.dispose)) {
                messageWriter.dispose();
            }
            if (Is.func(messageReader.dispose)) {
                messageReader.dispose();
            }
        },
        listen: function () {
            throwIfClosedOrDisposed();
            throwIfListening();
            state = ConnectionState.Listening;
            messageReader.listen(callback);
        },
        inspect: function () {
        }
    };
    connection.onNotification(LogTraceNotification.type, function (params) {
        if (trace === Trace.Off || !tracer) {
            return;
        }
        tracer.log(params.message, trace === Trace.Verbose ? params.verbose : undefined);
    });
    return connection;
}
function isMessageReader(value) {
    return value.listen !== void 0 && value.read === void 0;
}
function isMessageWriter(value) {
    return value.write !== void 0 && value.end === void 0;
}
function createMessageConnection(input, output, logger, strategy) {
    var reader = isMessageReader(input) ? input : new messageReader_1.StreamMessageReader(input);
    var writer = isMessageWriter(output) ? output : new messageWriter_1.StreamMessageWriter(output);
    return _createMessageConnection(reader, writer, logger, strategy);
}
exports.createMessageConnection = createMessageConnection;
