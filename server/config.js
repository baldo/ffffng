'use strict';

module.exports = (() => {
    const commandLineArgs = require('command-line-args');
    const commandLineUsage = require('command-line-usage');

    const commandLineDefs = [
        { name: 'help', alias: 'h', type: Boolean, description: 'Show this help' },
        { name: 'config', alias: 'c', type: String, description: 'Location of config.json' },
        { name: 'version', alias: 'v', type: Boolean, description: 'Show ffffng version' }
    ];

    let commandLineOptions;
    try {
        commandLineOptions = commandLineArgs(commandLineDefs);
    } catch (e) {
        console.error(e.message);
        console.error('Try \'--help\' for more information.');
        process.exit(1);
    }

    const fs = require('graceful-fs');

    const packageJsonFile = __dirname + '/../package.json';
    let version = 'unknown';
    if (fs.existsSync(packageJsonFile)) {
        version = JSON.parse(fs.readFileSync(packageJsonFile, 'utf8')).version;
    }

    function usage () {
        console.log(commandLineUsage([
            {
                header: 'ffffng - ' + version + ' - Freifunk node management form',
                optionList: commandLineDefs
            }
        ]));
    }

    if (commandLineOptions.help) {
        usage();
        process.exit(0);
    }

    if (commandLineOptions.version) {
        console.log('ffffng - ' + version);
        process.exit(0);
    }

    if (!commandLineOptions.config) {
        usage();
        process.exit(1);
    }

    const deepExtend = require('deep-extend');

    const defaultConfig = {
        server: {
            baseUrl: 'http://localhost:8080',
            port: 8080,

            databaseFile: '/tmp/ffffng.sqlite',
            peersPath: '/tmp/peers',

            logging: {
                directory: '/tmp/logs',
                debug: false,
                profile: false,
                logRequests: false
            },

            internal: {
                active: false,
                user: 'admin',
                password: 'secret'
            },

            email: {
                from: 'Freifunk Knotenformular <no-reply@musterstadt.freifunk.net>',

                // For details see: https://nodemailer.com/2-0-0-beta/setup-smtp/
                smtp: {
                    host: 'mail.example.com',
                    port: '465',
                    secure: true,
                    auth: {
                        user: 'user@example.com',
                        pass: 'pass'
                    }
                }
            },

            map: {
                nodesJsonUrl: ['http://map.musterstadt.freifunk.net/nodes.json']
            }
        },
        client: {
            community: {
                name: 'Freifunk Musterstadt',
                domain: 'musterstadt.freifunk.net',
                contactEmail: 'kontakt@musterstadt.freifunk.net',
                sites: [],
                domains: []
            },
            legal: {
                privacyUrl: null,
                imprintUrl: null
            },
            map: {
                mapUrl: 'http://map.musterstadt.freifunk.net'
            },
            monitoring: {
                enabled: false
            },
            coordsSelector: {
                showInfo: false,
                showBorderForDebugging: false,
                localCommunityPolygon: [],
                lat: 53.565278,
                lng: 10.001389,
                defaultZoom: 10,
                layers: {}
            }
        }
    };

    const configJSONFile = commandLineOptions.config;
    let configJSON = {};

    if (fs.existsSync(configJSONFile)) {
        configJSON = JSON.parse(fs.readFileSync(configJSONFile, 'utf8'));
    } else {
        console.error('config.json not found: ' + configJSONFile);
        process.exit(1);
    }

    const _ = require('lodash');

    function stripTrailingSlash (obj, field) {
        const url = obj[field];
        if (_.isString(url) && _.last(url) === '/') {
            obj[field] = url.substr(0, url.length - 1);
        }
    }

    const config = deepExtend({}, defaultConfig, configJSON);

    stripTrailingSlash(config.server, 'baseUrl');
    stripTrailingSlash(config.client.map, 'mapUrl');

    const url = require('url');
    config.server.rootPath = url.parse(config.server.baseUrl).pathname;
    config.client.rootPath = config.server.rootPath;

    return {
        config,
        version
    }
})()
