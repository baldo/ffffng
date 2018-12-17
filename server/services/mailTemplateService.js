'use strict';

const _ = require('lodash')
const async = require('async')
const deepExtend = require('deep-extend')
const fs = require('graceful-fs')
const moment = require('moment')

const config = require('../config').config
const Logger = require('../logger')
const UrlBuilder = require('../utils/urlBuilder')

const templateBasePath = __dirname + '/../mailTemplates';
const snippetsBasePath = templateBasePath + '/snippets';

const templateFunctions = {};

function renderSnippet(name, data) {
    const snippetFile = snippetsBasePath + '/' + name + '.html';

    return _.template(fs.readFileSync(snippetFile).toString())(deepExtend(
        {},
        // jshint -W040
        this, // parent data
        // jshint +W040
        data,
        templateFunctions
    ));
}

function snippet(name) {
    return function (data) {
        return renderSnippet.bind(this)(name, data);
    };
}

function renderLink(href, text) {
    return _.template(
        '<a href="<%- href %>#" style="color: #E5287A;"><%- text %></a>'
    )({
        href: href,
        text: text || href
    });
}

function renderHR() {
    return '<hr style="border-top: 1px solid #333333; border-left: 0; border-right: 0; border-bottom: 0;" />';
}

function formatDateTime(unix) {
    return moment.unix(unix).locale('de').local().format('DD.MM.YYYY HH:mm');
}

function formatFromNow(unix) {
    return moment.unix(unix).locale('de').fromNow();
}

templateFunctions.header = snippet('header');
templateFunctions.footer = snippet('footer');

templateFunctions.monitoringFooter = snippet('monitoring-footer');

templateFunctions.snippet = renderSnippet;

templateFunctions.link = renderLink;
templateFunctions.hr = renderHR;

templateFunctions.formatDateTime = formatDateTime;
templateFunctions.formatFromNow = formatFromNow;

module.exports = {
    configureTransporter (transporter) {
        const htmlToText = require('nodemailer-html-to-text').htmlToText;
        transporter.use('compile', htmlToText({
            tables: ['.table']
        }));
    },

    render (mailOptions, callback) {
        const templatePathPrefix = templateBasePath + '/' + mailOptions.email;

        async.parallel({
                subject: _.partial(fs.readFile, templatePathPrefix + '.subject.txt'),
                body: _.partial(fs.readFile, templatePathPrefix + '.body.html')
            },
            function (err, templates) {
                if (err) {
                    return callback(err);
                }

                const data = deepExtend(
                    {},
                    mailOptions.data,
                    {
                        community: config.client.community,
                        editNodeUrl: UrlBuilder.editNodeUrl()
                    },
                    templateFunctions
                );

                function render (field) {
                    return _.template(templates[field].toString())(data);
                }

                let renderedTemplate;
                try {
                    renderedTemplate = {
                        subject: _.trim(render('subject')),
                        body: render('body')
                    };
                } catch (error) {
                    Logger
                        .tag('mail', 'template')
                        .error('Error rendering template for mail[' + mailOptions.id + ']:', error);
                    return callback(error);
                }

                callback(null, renderedTemplate);
            }
        );
    }
}
