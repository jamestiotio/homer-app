import uuid from 'uuid/v4';
import {pick} from 'lodash';
import Joi from 'joi';
import Boom from 'boom';
import SubMappingData from '../classes/submappingdata';

export default function search(server) {
  server.route({
    path: '/api/v3/submapping/protocols',
    method: 'GET',
    handler: function(request, reply) {
      const submappingdata = new SubMappingData({server});
     
      submappingdata.getProtocols().then(function(data) {
        if (!data) {
          return reply(Boom.notFound('data was not found'));
        }
        return reply(data);
      }).catch(function(error) {
        return reply(Boom.serverUnavailable(error));
      });
    },
  });

  server.route({
    path: '/api/v3/submapping/fields/{id}/{transaction}',
    method: 'GET',
    handler: function(request, reply) {
      let id = encodeURIComponent(request.params.id);
      let transaction = encodeURIComponent(request.params.transaction);
      
      const submappingdata = new SubMappingData({server});

      submappingdata.getFields(id, transaction).then(function(data) {
        if (!data) {
          return reply(Boom.notFound('data was not found'));
        }
        return reply(data);
      }).catch(function(error) {
        return reply(Boom.serverUnavailable(error));
      });
    },
  });
  
  server.route({
    /**
     * GET all submapping settings
     *
     * @header
     *  @param {string} JWT token for authentication
     * @return {array} list of submapping data
     */
    path: '/api/v3/submapping/protocol',
    method: 'GET',
    config: {
      auth: {
        strategy: 'token',
      },
    },
    handler: async function(request, reply) {
      const settings = new SubMappingData({server});

      try {
        const data = await settings.getAll(['guid', 'profile', 'hepid', 'hep_alias', 'partid', 'version', 'retention', 'partition_step', 'create_index', 'create_table', 'correlation_submapping', 'fields_submapping', 'submapping_settings', 'schema_submapping', 'schema_settings']);
        if (!data || !data.length) {
          return reply(Boom.notFound('no submapping settings found'));
        }
  
        return reply({
          count: data.length,
          data,
        });
      } catch (err) {
        return reply(Boom.serverUnavailable(err));
      }
    },
  });

  server.route({
    /**
     * GET submapping settings by guid
     *
     * @header
     *  @param {string} JWT token for authentication
     * @request
     *  @param {string} guid
     * @return {array} list of submapping data
     */
    path: '/api/v3/submapping/protocol/{guid}',
    method: 'GET',
    config: {
      auth: {
        strategy: 'token',
      },
      validate: {
        params: {
          guid: Joi.string().min(12).max(46).required(),
        },
      },
    },
    handler: async function(request, reply) {
      const {guid} = request.params;
      const settings = new SubMappingData({server, guid});

      try {
        const data = await settings.getAll(['guid', 'profile', 'hepid', 'hep_alias', 'partid', 'version', 'retention', 'partition_step', 'create_index', 'create_table', 'correlation_submapping', 'fields_submapping', 'submapping_settings', 'schema_submapping', 'schema_settings']);
        if (!data || !Object.keys(data).length) {
          return reply(Boom.notFound('no advacned settings found for guid ' + guid));
        }
  
        return reply({
          count: data.length,
          data,
        });
      } catch (err) {
        return reply(Boom.serverUnavailable(err));
      }
    },
  });

  server.route({
    /**
     * Create (POST) a new submapping settings
     *
     * @header
     *  @param {string} JWT token for authentication
     * @payload
     *  @param {number} partid
     *  @param {string} category
     *  @param {string} param
     *  @param {string} data
     * @return submapping settings guid and success message
     */
    path: '/api/v3/submapping/protocol',
    method: 'POST',
    config: {
      auth: {
        strategy: 'token',
      },
      /*
      validate: {
        payload: {
          partid: Joi.number().required(),
          category: Joi.string().min(3).max(50).required(),
          param: Joi.string().min(3).max(50).required(),
          data: Joi.string(),
        },
      },
      */
    },
    handler: async function(request, reply) {
      const {profile, hepid, hep_alias, partid, version, retention, partition_step, create_index, create_table, correlation_submapping, fields_submapping, submapping_settings, schema_submapping, schema_settings} = request.payload;
      const guid = uuid();
      const settings = new SubMappingData({server});

      try {
        await settings.add({profile, hepid, hep_alias, partid, version, retention, partition_step, create_index, create_table, correlation_submapping, fields_submapping, submapping_settings, schema_submapping, schema_settings});
        return reply({
          data: guid,
          message: 'successfully created submapping settings',
        }).code(201);
      } catch (err) {
        return reply(Boom.serverUnavailable(err));
      }
    },
  });

  server.route({
    /**
     * Update (PUT) an submapping setttings
     *
     * @header
     *  @param {string} JWT token for authentication
     * @request
     *  @param {string} guid
     * @payload
     *  @param {number} partid
     *  @param {string} category
     *  @param {string} param
     *  @param {string} data
     * @return submapping settings guid and success message
     */
    path: '/api/v3/submapping/protocol/{guid}',
    method: 'PUT',
    config: {
      auth: {
        strategy: 'token',
      },
      validate: {
        params: {
          guid: Joi.string().min(12).max(46).required(),
        },
        /*
        payload: {
          partid: Joi.number(),
          category: Joi.string().min(3).max(50),
          param: Joi.string().min(3).max(50),
          data: Joi.string(),
        },
        */
      },
      pre: [
        {
          method: async function(request, reply) {
            const {guid} = request.params;
            const settings = new SubMappingData({server, guid});

            try {
              const res = await settings.get(['guid']);
              if (!res || !res.guid || res.guid !== guid) {
                return reply(Boom.notFound(`the submapping settings with id ${guid} was not found`));
              }

              return reply.continue();
            } catch (err) {
              return reply(Boom.serverUnavailable(err));
            }
          },
        },
      ],
    },
    handler: async function(request, reply) {
      const {guid} = request.params;
      const updates = pick(request.payload, ['guid', 'profile', 'hepid', 'hep_alias', 'partid', 'version', 'retention', 'partition_step', 'create_index', 'create_table', 'correlation_submapping', 'fields_submapping', 'submapping_settings', 'schema_submapping', 'schema_settings']);

      const settings = new SubMappingData({server, guid});

      try {
        await settings.update(updates);
        return reply({
          data: guid,
          message: 'successfully updated submapping settings',
        }).code(201);
      } catch (err) {
        return reply(Boom.serverUnavailable(err));
      }
    },
  });

  server.route({
    /**
     * DELETE an submapping settings
     *
     * @header
     *  @param {string} JWT token for authentication
     * @request
     *  @param {string} guid
     * @return submapping settings guid and success message
     */
    path: '/api/v3/submapping/protocol/{guid}',
    method: 'DELETE',
    config: {
      auth: {
        strategy: 'token',
      },
      validate: {
        params: {
          guid: Joi.string().min(12).max(46).required(),
        },
      },
      pre: [
        {
          method: async function(request, reply) {
            const {guid} = request.params;
            const settings = new SubMappingData({server, guid});

            try {
              const res = await settings.get(['guid']);
              if (!res || !res.guid || res.guid !== guid) {
                return reply(Boom.notFound(`the submapping settings with id ${guid} were not found`));
              }

              return reply.continue();
            } catch (err) {
              return reply(Boom.serverUnavailable(err));
            }
          },
        },
      ],
    },
    handler: async function(request, reply) {
      const {guid} = request.params;
      const settings = new SubMappingData({server, guid});

      try {
        await settings.delete();
        return reply({
          data: guid,
          message: 'successfully deleted submapping settings',
        }).code(201);
      } catch (err) {
        return reply(Boom.serverUnavailable(err));
      }
    },
  });
};
