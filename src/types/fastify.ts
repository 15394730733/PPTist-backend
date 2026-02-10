/**
 * Fastify Type Extensions
 *
 * Extends Fastify instance with custom decorators and properties.
 */

import { FastifyInstance } from 'fastify';
import { ConvertController } from '../api/v1/controllers/convert';
import { TaskController } from '../api/v1/controllers/tasks';

/**
 * Extended Fastify instance with custom controllers
 */
declare module 'fastify' {
  interface FastifyInstance {
    convertController: InstanceType<typeof ConvertController>;
    taskController: InstanceType<typeof TaskController>;
  }
}

export {};
