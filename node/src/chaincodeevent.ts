/*
 * Copyright 2021 IBM All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { CloseableAsyncIterable } from './client';
import { ChaincodeEventsResponse } from './protos/gateway/gateway_pb';
import { ChaincodeEvent as ChaincodeEventProto } from './protos/peer/chaincode_event_pb';

/**
 * Chaincode event emitted by a transaction function.
 */
export interface ChaincodeEvent {
    /**
     * Block number that included this chaincode event.
     */
    blockNumber: bigint;

    /**
     * Transaction that emitted this chaincode event.
     */
    transactionId: string;

    /**
     * Chaincode that emitted this event.
     */
    chaincodeId: string;

    /**
     * Name of the emitted event.
     */
    eventName: string;

    /**
     * Application defined payload data associated with this event.
     */
    payload: Uint8Array;
}

export function newChaincodeEvents(responses: CloseableAsyncIterable<ChaincodeEventsResponse>): CloseableAsyncIterable<ChaincodeEvent> {
    let closed = false;
    return {
        async* [Symbol.asyncIterator]() { // eslint-disable-line @typescript-eslint/require-await
            for await (const response of responses) {
                if (closed) {
                    return;
                }
                
                const blockNumber = BigInt(response.getBlockNumber() ?? 0);
                const events = response.getEventsList() || [];
                for (const event of events) {
                    yield newChaincodeEvent(blockNumber, event);
                }
            }
        },
        close: () => {
            closed = true;
            responses.close();
        },
    };
}

function newChaincodeEvent(blockNumber: bigint, event: ChaincodeEventProto): ChaincodeEvent {
    return {
        blockNumber,
        chaincodeId: event.getChaincodeId() ?? '',
        eventName: event.getEventName() ?? '',
        transactionId: event.getTxId() ?? '',
        payload: event.getPayload_asU8() || new Uint8Array(),
    };
}
