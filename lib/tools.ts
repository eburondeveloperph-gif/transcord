
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { FunctionResponseScheduling } from '@google/genai';
import { FunctionCall } from './state';

export const AVAILABLE_TOOLS: FunctionCall[] = [
  {
    name: 'broadcast_to_websocket',
    description: 'Sends a text prompt to the external WebSocket read-aloud system.',
    parameters: {
      type: 'OBJECT',
      properties: {
        text: {
          type: 'STRING',
          description: 'The text prompt to broadcast for reading aloud.',
        },
      },
      required: ['text'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
  },
  {
    name: 'start_return',
    description: 'Starts the return process for an item, collecting necessary details from the user.',
    parameters: {
      type: 'OBJECT',
      properties: {
        orderId: {
          type: 'STRING',
          description: 'The ID of the order containing the item to be returned.',
        },
        itemName: {
          type: 'STRING',
          description: 'The name of the item the user wants to return.',
        },
        reason: {
          type: 'STRING',
          description: 'The reason the user is returning the item.',
        },
      },
      required: ['orderId', 'itemName', 'reason'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
  },
  {
    name: 'get_order_status',
    description: 'Provides the current status of a user\'s order, searching by order ID or customer details.',
    parameters: {
      type: 'OBJECT',
      properties: {
        orderId: {
          type: 'STRING',
          description: 'The ID of the order to check. Ask for this first.',
        },
        customerName: {
          type: 'STRING',
          description: 'The name of the customer, if order ID is not available.',
        },
        customerEmail: {
          type: 'STRING',
          description: 'The email of the customer, if order ID is not available.',
        },
      },
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
  },
];
