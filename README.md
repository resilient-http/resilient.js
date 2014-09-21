# resilient [![Build Status](https://api.travis-ci.org/h2non/resilient.svg?branch=master)][travis] [![Stories in Ready](https://badge.waffle.io/h2non/resilient.png?label=ready&title=Ready)](https://waffle.io/h2non/resilient) [![Code Climate](https://codeclimate.com/github/h2non/resilient/badges/gpa.svg)](https://codeclimate.com/github/h2non/resilient) [![Gitter chat](https://badges.gitter.im/h2non/resilient.png)](https://gitter.im/h2non/resilient)

> **WORK IN PROGRESS**

**resilient** is a fault tolerant, client-based balance and full featured HTTP client
for modern web applications and distributed systems

## Introduction

<img align="right" height="280" src="https://raw.githubusercontent.com/h2non/resilient/gh-pages/images/resilient.png" />

Organisations working in disparate domains are independently discovering patterns for building software that look the same. These systems are more robust, more resilient, more flexible and better positioned to meet modern demands.

The system stays responsive in the face of failure.
This applies not only to highly-available, mission critical systems — any system that is not resilient will be unresponsive after a failure

### What resilient means?

Resilience is achieved by replication, containment, isolation and delegation.
Failures are contained within each component, isolating components from each other
and thereby ensuring that parts of the system can fail and recover without
compromising the system as a whole. Recovery of each component is delegated to another (external)
component and high-availability is ensured by replication where necessary.
The client of a component is not burdened with handling its failures

<!--
### But why in the browser?

Web applications evolved notably in the latest years, achieving and delegating new responsabilities in the client side.
The Web (and therefore HTTP) is based on a client-server architecture

### How it works?
-->

## Installation

Via [Bower](http://bower.io)
```bash
bower install resilient
```
Via [Component](http://component.io/)
```bash
component install h2non/resilient
```
Or loading the script remotely
```html
<script src="//cdn.rawgit.com/h2non/resilient/0.1.0/resilient.js"></script>
```

## Features

`To Do`

## Environments

Runs in any [ES5 compliant](http://kangax.github.io/compat-table/es5/) browser.
Cross-browser support guaranteed running tests with [Karma](http://karma-runner.github.io/) and [BrowserStack](http://browserstack.com/)

- Chrome >= 5
- Firefox >= 3
- Safari >= 5
- Opera >= 10
- IE >= 9

## Basic usage

If `require` is available, you must use it to fetch the module.
Otherwise it will be available as global exposed as `resilient`

```js
var resilient = require('resilient')
```

## API

### resilient([ options ])

Creates a new HTTP client with custom config

#### Options

##### HTTP client

- **url** `string` - Server request URL
- **data** `mixed` - Payload data to send as body request
- **headers** `object` - Map of strings representing HTTP headers to send to the server
- **timeout** `number` - Request maximum timeout in milliseconds. Default to 30 seconds
- **auth** `object` -  Authentication credentials to the server. Object must have the `user` and `password` properties
- **async** `boolean` - Set to `false` if the request must be performed as synchronous operation (not recommended)
- **withCredentials** `boolean` - Whether to set the withCredentials flag on the XHR object. See [MDN][withcredentials] for more information
- **method** `string` - Request HTTP method. Default to `GET`
- **responseType** `string` - Define how to handle the response data. Allowed values are: `text`, `arraybuffer`, `blob` or `document`

##### Balancer

- **enable** `boolean` - Enable/disable browser client balancer. Default `true`
- **orderBy** `string` - Order criteria. Supported values are: `latency`, `errors`, ``. Default to: `latency`.
- ****

##### Servers

- **servers** `array` - A list of valid URIs
- **discoveryServers** `array` - A list of valid URIs of endpoints to update
- **discoveryTimeout** `number` - Server discovery network timeout in miliseconds. Default `3000`
- **discoveryFallback** `boolean` - Enable/disable servers discovery fallback if a server cannot be reached or is unavailable. Default `true`

### resilient#get(options, callback)

### resilient#post(options, callback)

### resilient#put(options, callback)

### resilient#del(options, callback)

### resilient#patch(options, callback)

### resilient#head(options, callback)

## Contributing

Wanna help? Cool! It will be appreciated :)

You must add new test cases for any new feature or refactor you do,
always following the same design/code patterns that already exist

### Development

Only [node.js](http://nodejs.org) is required for development

Clone the repository
```bash
$ git clone https://github.com/h2non/resilient.git && cd resilient
```

Install development dependencies
```bash
$ npm install
```

Install browser dependencies
```bash
$ bower install
```

Generate browser bundle source
```bash
$ make browser
```

Run tests (in a headless browser)
```bash
$ make test
```

Run tests (in real browsers)
```bash
$ make karma
```

## License

[MIT](http://opensource.org/licenses/MIT) © Tomas Aparicio and contributors

[travis]: http://travis-ci.org/h2non/resilient
