# resilient.js [![Build Status](https://api.travis-ci.org/resilient-http/resilient.js.svg?branch=master)][travis] [![Stories in Ready](https://badge.waffle.io/resilient-http/resilient.js.png?label=ready&title=Ready)](https://waffle.io/resilient-http/resilient.js) [![Code Climate](https://codeclimate.com/github/resilient-http/resilient.js/badges/gpa.svg)](https://codeclimate.com/github/resilient-http/resilient.js) [![NPM](https://img.shields.io/npm/v/resilient.svg)](https://www.npmjs.org/package/resilient) ![Downloads](https://img.shields.io/npm/dm/resilient.svg)

<img align="right" height="150" src="https://raw.githubusercontent.com/resilient-http/resilient-http.github.io/master/images/logo.png" />

A **browser** and **[node.js](http://nodejs.org)** highly **configurable** and **full featured HTTP client** with **superpowers** such as **fault tolerant**, **dynamic servers discovery**, transparent server **fallback**, **request retry** cycles, built-in **balancer**, round-robin scheduling for better **load distribution** and [more](#features)...

It was designed for distributed and [reactive](http://www.reactivemanifesto.org/) systems, stateless resource-oriented services, redundant high available HTTP APIs, multicloud services... among others

It provides an elegant [programmatic API](#api) and featured [command-line interface](#command-line-interface)

For more information, see the [project site](http://resilient-http.github.io), the [request flow algorithm](#how-it-works), [compatible servers](http://resilient-http.github.io/#servers) or read the [FAQs](#faq)

## Features

- Reliable failover and excellent error handling with transparent server fallback
- Client-side based balancer using a simple best availability algorithm
- Smart balancer logic based on server score (network latency, errors and succesfull requests)
- Transparent request retry cycle attempts on failure
- Discern best servers based on scoring per read and write operations when balancing
- Configurable balancer policy by weight
- Highly configurable (timeouts, retry loop, cache, fallback behavior, wait before retry...)
- Avoid fallback/retry cycles per custom HTTP responses codes or methods
- Define custom timeouts per HTTP method (permissive for POST/PUT/DELETE, aggressive for GET)
- Configurable specific request timeouts per HTTP method (useful to differ get/post requests)
- Parallel servers discovering for a faster availability
- Built-in support for request/response interceptors
- Built-in support for servers caching to improve reliability when fallback
- Cross engine (node.js and browsers. ES5 compliant)
- Configurable external HTTP client to use as forward request proxy (instead of using the embedded one)
- Dynamic servers discovery (based on the resilient [specification](https://github.com/resilient-http/spec) protocol)
- Support promiscuous errors (400-499 response status code)
- Support mock/stub working mode via middleware (useful for testing)
- Full HTTP features support (it uses internally [request](https://github.com/mikeal/request) and [lil-http](https://github.com/lil-js/http) for the browser)
- Support round robin scheduling algorithm for traffic distribution (experimental)
- Lightweight library (8KB gzipped)
- Featured cURL-inspired command-line interface
- Well tested in both node.js and browsers

## Installation

#### Node.js

```bash
npm install resilient
```

#### Browser

Via [Bower](http://bower.io)
```bash
bower install resilient
```

Via [Component](https://github.com/componentjs/component)
```bash
component install resilient-http/resilient.js
```

Or loading the script remotely
```html
<script src="//cdn.rawgit.com/resilient-http/resilient.js/0.2.20/resilient.js"></script>
```

## Environments

It runs in any [ES5 compliant](http://kangax.github.io/compat-table/es5/) engine

- Node.js
- Chrome >= 5
- Firefox >= 3
- Safari >= 5
- Opera >= 10
- IE >= 9

## Related projects

- [hydra](http://innotech.github.io/hydra) - Multicloud balancer and application discovery server
- [resilient-server](https://github.com/h2non/resilient-server) - node.js powered dummy HTTP discovery server for testing/development
- [angular-resilient](https://github.com/h2non/angular-resilient) - Turn $http resilient and fault tolerant

## How to use?

See the [basic usage](#basic-usage) and [examples](https://github.com/resilient-http/resilient.js/tree/master/examples) for detailed use cases

## How it works?

An algorithm diagram worth more than words

<img src="http://rawgit.com/resilient-http/resilient-http.github.io/master/images/algorithm.svg" />

## Basic usage

If `require` is available, you must use it to fetch the module.
Otherwise it will be available as global exposed as `resilient`

```js
var Resilient = require('resilient')
```

#### Static servers

Define your servers pool
```js
var servers = [
  'http://api1.server.com',
  'http://api2.server.com',
  'http://api3.server.com'
]
```

Create a new client and set the servers to balance
```js
var client = Resilient({ service: { basePath: '/api/1.0' }})
client.setServers(servers)
```

Perform the request (the best available server will be used automatically)
```js
client.get('/users', function (err, res) {
  if (res.status === 200) {
    console.log('Success:', res.data)
  }
})
```

#### Dynamic servers discovery

Define the discovery servers pool
```js
var servers = [
  'http://discover1.server.com',
  'http://discover2.server.com',
  'http://discover3.server.com'
]
```

Create a new client and set the discovering servers
```js
var client = Resilient({ service: { basePath: '/api/1.0' }})
client.discoveryServers(servers)
```

Perform the request (and that's all, forget about anything else)
```js
client.get('/users', function (err, res) {
  if (res.status === 200) {
    console.log('Success:', res.data)
  }
})
```

For more usage cases, see the [examples](https://github.com/resilient-http/resilient.js/tree/master/examples) folder

## Command-line interface

For better approach you could install `Resilient` as global package: `npm install -g resilient`

```bash
Resilient command-line HTTP client
Usage: resilient [url] [options]

Examples:
  resilient http://httpbin.org/user-agent
  resilient --status http://httpbin.org/status/201
  resilient --info http://httpbin.org/status/204
  resilient http://httpbin.org/post -x POST \
            -d '{"hello":"world"}' -h "Content-Type: application/json"
  resilient /api/users -s http://server1.net,http://server2.net
  resilient /api/users -z http://discover1.net,http://discover2.net
  resilient --discover -z http://discover1.net,http://discover2.net --discovery-timeout 500

Options:
  --version, -v            Show the server version
  --path, -p               Request path
  --servers, -s            Define the service servers (comma separated)
  --method, -x             HTTP method
  --header, -h             Define custom request header
  --data, -d               Value data to send as HTTP request body
  --file, -f               File path to send as HTTP request body
  --retry, -r              Request retry attempts                                       [default: 0]
  --timeout, -t            Request timeout in miliseconds
  --discover, -k           Get an updated list of servers asking for discovery servers
  --discovery-servers, -z  Define the discovery service servers (comma separated)
  --discovery-retry, -R    Discovery servers retry attempts                             [default: 0]
  --discovery-timeout, -T  Discovery servers request maximum timeout in miliseconds
  --info, -i               Show response headers and info
  --info-headers, -I       Show only the response status and headers
  --status, -c             Print the response status code
  --debug, -D              Enable debug mode
  --help, -H               Show help
```

## API

### resilient([ options ])

Creates a new `resilient` client with custom config

### Options

The options `object` has three different first-level properties of configuration

```js
Resilient({
  service: { ... }
  discovery: { ... }
  balancer: { ... }
})
```

##### Service

There are specific config options for the servers of the client service.
Resilient is a resource-oriented HTTP client, which could be ideal for RESTful Web services

- **servers** `array` - A list of valid URIs of servers to reach for the given service. Default `null`. It's recommended you use discovery servers instead
- **retry** `number` - Number of times to retry if all requests failed. Use `Infinity` for infinitive attemps. Default `0`
- **retryWait** `number` - Number of milisenconds to wait before start the request retry cycle. Default to `50`
- **discoverBeforeRetry** `boolean` - Force to refresh service servers list from asking for discovery servers on each retry attempt. You must define the discovery servers in order to use this feature. Default `true`
- **promiscuousErrors** `boolean` - Enable promiscuous error handling mode. Client HTTP status errors (400-499) will be treated as failed request, retrying it until it has valid status (when `retry` is enabled). Default `false`
- **omitRetryWhen** `array<object>` - A collection of rules per method and status code to match in order to omit a request retry cycle. See the usage [example](https://github.com/resilient-http/resilient.js/blob/master/examples/omit-fallback-options.js). Default `null`
- **omitFallbackWhen** `array<object>` - A collection of rules per method and status code to match in order to omit a request server fallback. See usage [example](https://github.com/resilient-http/resilient.js/blob/master/examples/omit-fallback-options.js). Default `null`
- **omitRetryOnMethods** `array<string>` - Omit a retry cycle attempt if the request method is on the given array. Default `null`
- **omitFallbackOnMethods** `array<string>` - Omit fallback to the next best available server if the method is on the given array. If you use this option, retry cycles will be disables too for the given methods. Default `null`
- **omitRetryOnErrorCodes** `array<number>` - Omit a retry cycle attempt if the latest request response status code is one of the given array. Default `null`
- **omitFallbackOnErrorCodes** `array<number>` - Omit fallback to the next best available server if the latest request response status code is one of the given array. Default `null`
- **timeouts** `object` - Define custom request timeout values in miliseconds per HTTP method, useful to differ read/write requests. This option has priority over the `timeout` option. Default: `null`

Specific shared configuration options for the HTTP client for final service requests

- **path** `string` - Server request path as part of the final URL
- **basePath** `string` - Server resource base path to share between all requests
- **method** `string` - Request HTTP method. Default to `GET`
- **data** `mixed` - Payload data to send as body request
- **headers** `object` - Map of strings representing HTTP headers to send to the server
- **params** `object` - Map of strings representing the query params
- **timeout** `number` - Request maximum timeout in miliseconds before to abort it. Default to `10` seconds
- **auth** `object` - Authentication credentials to the server. Object must have both `user` and `password` properties

**Browser specific options**

- **withCredentials** `boolean` - Whether to set the withCredentials flag on the XHR object. See [MDN][withcredentials] for more information
- **responseType** `string` - Define how to handle the response data. Allowed values are: `text`, `arraybuffer`, `blob` or `document`

**Node.js specific options**

See all HTTP options supported for `node.js` [here](https://github.com/mikeal/request#requestoptions-callback)

##### Balancer

- **enable** `boolean` - Enable/disable the smart client balancer. Default `true`
- **roundRobin** `boolean` - Enable RobinRobin scheudle algorithm (experimental)
- **roundRobinSize** `number` - Round robin round size. Useful to increase requests distribution across different servers. Default to `3` servers
- **weight** `object` - Balacer point percentage weight for server scoring policy:
  - **success** `number` - Percentage weight for success request. Default to `15`
  - **error** `number` - Percentage weight for failed request. Default to `50`
  - **latency** `number` - Percentage weight for request average latency. Default to `35`

##### Discovery

Specific configuration for discovery servers requests, behavior and logic

- **servers** `array` - A list of valid URIs of endpoints to use as discovery servers
- **cacheEnabled** `boolean` - Enable/disable discovery servers cache in case of global fallback. Default `true`
- **cacheExpiration** `number` - Maximum cache time to live. Default to `10` minutes
- **retry** `number` - Number of times to retry if all requests failed. Use `Infinity` for infinitive attemps. Default `3`
- **retryWait** `number` - Number of milisenconds to wait before start the request retry cycle. Default to `1000`
- **parallel** `boolean` - Discover servers in parallel. This will improve service availability and decrement server lookup delays. Default `true`
- **refreshInterval** `number` - Servers list time to live in miliseconds. Default to `2` minutes
- **enableRefreshServers** `boolean` - Enable/disable discovery servers auto refresh. This option requires `refreshServers` or `useDiscoveryServersToRefresh` be defined. Default `true`
- **refreshServers** `array` - Servers list of refresh servers. This will enable automatically update discovery servers list asking for them selves to the following list of servers on each interval. Default `null`
- **refreshServersInterval** `number` - Discovery servers list time to live in miliseconds. Default to `5` minutes
- **useDiscoveryServersToRefresh** `boolean` - Enable/disable self-discovery using the discovery servers pools (useful for Hydra). This options requires the `refreshPath` option be defined. Default `false`
- **refreshPath** `string` - Discovery refresh servers lookup path. Example: `/app/hydra` for Hydra. This options requires you define `useDiscoveryServersToRefresh` to `true`. Default `null`
- **refreshOptions** `object` - Custom HTTP options for discovery servers refresh. By default inherits from discovery options
- **promiscuousErrors** `boolean` - Enable promiscuous error handling mode. Client HTTP status errors (400-499) will be treated as failed request, retrying it until it has valid status (when `retry` is enabled). Default `false`
- **omitRetryWhen** `array<object>` - A collection of rules per method and status code to match in order to omit a request retry cycle. See the usage [example](https://github.com/resilient-http/resilient.js/blob/master/examples/omit-fallback-options.js). Default `null`
- **omitFallbackWhen** `array<object>` - A collection of rules per method and status code to match in order to omit a request server fallback. See usage [example](https://github.com/resilient-http/resilient.js/blob/master/examples/omit-fallback-options.js). Default `null`
- **omitRetryOnMethods** `array<string>` - Omit a retry cycle attempt if the request method is on the given array. Default `null`
- **omitFallbackOnMethods** `array<string>` - Omit fallback to the next best available server if the method is on the given array. If you use this option, retry cycles will be disables too for the given methods. Default `null`
- **omitRetryOnErrorCodes** `array<number>` - Omit a retry cycle attempt if the latest request response status code is one of the given array. Default `null`
- **omitFallbackOnErrorCodes** `array<number>` - Omit fallback to the next best available server if the latest request response status code is one of the given array. Default `null`
- **timeouts** `object` - Define custom request timeout values in miliseconds per HTTP method, useful to differ read/write requests. This option has priority over the `timeout` option. Default: `null`

Specific shared configuration options for the HTTP client for discovering processes

- **path** `string` - Server request path as part of the final URL
- **basePath** `string` - Server resource base path to share between all requests
- **timeout** `number` - Server discovery network timeout in miliseconds. Default `2` seconds
- **auth** `object` - Authentication credentials required for the discovery server. Object must have both `user` and `password` properties
- **params** `object` - Map of strings representing the query params
- **headers** `object` - Map of strings representing HTTP headers to send to the discovery server
- **method** `string` - Request HTTP method. Default to `GET`
- **data** `mixed` - Optional data to send as payload to discovery servers. Default `null`

For `node.js`, see all HTTP options supported [here](https://github.com/mikeal/request#requestoptions-callback)

### Request callback arguments

- **error** [Error|ResilientError](#error) - Response error, if happends. Otherwise `null`
- **response** [Object](#response)|[http.IncomingMessage][httpMessage] - Response object

#### Response

##### Browser

- **data** `mixed` - Body response. If the MIME type is `JSON-compatible`, it will be transparently parsed
- **status** `number` - HTTP response status code
- **headers** `object` - Response headers
- **xhr** `object` - Original XHR instance
- **error** `mixed` - Error info, usually an `Error` instance (in case that an error happens)

##### Node.js

See [http.IncomingMessage][httpMessage]

#### Error

It could be an `Error` or plain `Object` instance with the following members

- **message** `string` - Human readable error message description
- **status** `number` - Internal error code or server HTTP response status
- **code** `number` - Optional error code (node.js only)
- **stack** `string` - Optional stack error trace
- **request** `object` - Original response object in case that a custom Resilient error happends. Optional
- **error** `Error` - Original throwed Error instance (node.js only). Optional
- **xhr** `XMLHttpRequest` - XHR native instance (browser only)

##### Built-in error codes

- **1000** - All requests failed. No servers available
- **1001** - Cannot update discovery servers. Empty or invalid response body
- **1002** - Missing discovery servers. Cannot resolve the server
- **1003** - Cannot resolve servers. Missing data
- **1004** - Discovery server response is invalid or empty
- **1005** - Missing servers during retry process
- **1006** - Internal state error (usually caused by an unexpected exception)

#### Events

Resilient client has a built-in support for internal states event dispacher and notifier to the public interface

This could be useful really useful while using an interceptor pattern in order to detect states and data changes.
You can intercept and change any request configuration and response subscribing to the pre/post process hooks.
Note that mutation is required, you should modify the `object` by reference and do not lose it

```js
// subscribe to every outgoing request before be dropped to the network
resilientClient.on('request:start', function handler(options, resilient) {
  // mutate the options, adding an aditional header
  options.headers['API-Token'] = 'awesome!'
  // unsubscribe example
  resilientClient.off('request:start', handler)
})
```

##### request:start
Arguments: `options<Object>`, `resilient<Resilient>`

Fired before a request is created

You can intercept and modify the request options on the fly,
but you must mutate the options `object` and do not lose its reference

##### request:finish
Arguments: `error<Error>`, `response<Object|http.IncomingMessage>`, `resilient<Resilient>`

Fired after a request was completed

You can intercept and modify the error/response on the fly,
but you must mutate the options `object` and do not lose its reference

##### request:retry
Arguments: `options<Object>`, `servers<Servers>`

Fired when a request performs a retry attempt cycle, that means all the previous requests has failed

You can intercept and modify the `options` object on the fly,
but you must mutate it and do not lose its reference

##### servers:refresh
Arguments: `servers<Array>`, `resilient<Resilient>`

Fired every time that service servers list is updated from discovery servers

##### servers:cache
Arguments: `servers<Array>`, `resilient<Resilient>`

Fired every time that servers cache is updated

##### discovery:refresh
Arguments: `servers<Array>`, `resilient<Resilient>`

Fired every time that discovery servers are updated form refresh servers

### resilient#send(path, options, callback)

Performs a custom request with the given options.
It's recommended using as generic interface to make multi verb requests

### resilient#get(path, options, callback)
Return `Client`

Creates a GET request with optional custom options

### resilient#post(path, options, callback)
Return `Client`

Creates a POST request with optional custom options
Return `Client`

### resilient#put(path, options, callback)
Return `Client`

Creates a PUT request with optional custom options

### resilient#delete(path, options, callback)
Alias: `del` | Return `Client`

Creates a DELETE request with optional custom options

### resilient#patch(path, options, callback)
Return `Client`

Creates a PATCH request with optional custom options

### resilient#head(path, options, callback)
Return `Client`

Creates a HEAD request with optional custom options

### resilient#options([ type|options, options ])

Getter/setter accessor for resilient options, optionally per type. See [supported options](#options)

### resilient#serviceOptions([ options ])

Getter/setter accessor for [service-level config options](#service)

### resilient#discoveryOptions([ options ])

Getter/setter accessor for [discovery-level config options](#discovery)

### resilient#balancer([ options ])
Return: `object`

Getter/Setter accessor for [balancer-level config options](#balancer)

### resilient#getHttpOptions(type)
Return: `object`

Get a map of HTTP specific options

### resilient#areServersUpdated()
Return: `boolean`

Returns `true` if servers are up-to-date. Otherwise `false`

### resilient#servers([ type = 'service' ])
Return: `Servers`

Return a `Servers` instance with the current used servers per type. Allowed types are: `service` and `discovery`

### resilient#resetScore([ type = 'service' ])
Return: `Resilient` Alias: `resetStats`

Reset servers stats score based on network latency and percentage of success and failed requests

This score is the average calculus of the total amount of sent requests from the client to each server.
This score is used in the scheduling algorithm in order
to determinate the best available server (in the case that the `balance` option is enabled)

Allowed types are: `service` and `discovery`

### resilient#discoveryServers([ servers ])
Return: `Servers`

Setter/Getter for discovery servers list

### resilient#discoverServers([ options, ] cb)
Return: `Resilient`

Pass to the callback an up-to-date list of servers asking to discovery servers

Passed arguments to the callback are:
- **error** `object` - Error, if it happend
- **servers** `array` - Array of `string` with the current service servers URL

### resilient#latestServers([ options, ] cb)
Return: `Resilient` Alias: `getUpdatedServers`

Pass to the callback an up-to-date list of servers, with or without discovery servers configured

Passed arguments to the callback are:
- **error** `object` - Error, if it happend
- **servers** `array` - Array of `string` with the current service servers URL

### resilient#updateServers([ options, ] cb)

Force to update the servers list from discovery servers, if they are defined,
optionally passing a callback to handle the result

Passed arguments to the callback are:
- **error** `object` - Error, if it happend
- **servers** `array` - Array of `string` with the current service servers URL

### resilient#useHttpClient(fn)

Use a custom HTTP client as proxy instead of the embedded `resilient` native HTTP client.

Useful to define use proxy for custom frameworks or libraries in your existent project when you need to deal with some complex HTTP pre/post hooks logic and exploit custom HTTP client features

If defined, all the outgoing requests through Resilient client will be proxied to it.

Arguments passed to the client function:
- **options** `object` - Resilient HTTP [service options](#service)
- **callback** `function` - Request status handler. Expected arguments are: `error`, `response`

Note: `error` and `response` objects must be compatible with the [current interface](#request-callback-arguments)

### resilient#restoreHttpClient()

Restore the native `resilient` HTTP client

### resilient#mock(mockFn)

Define a mock/fake HTTP client error/response `object` for all outgoing requests

```js
resilient.mock(function (options, cb) {
  if (options.url === 'http://discovery.server.me') {
    // fake response
    cb(null, { status: 200, data: ['http://server.net'] })
  } else {
    // fake unavailable status
    cb(null, { status: 503 })
  }
})
```

See also the `useHttpClient()` method for custom request proxy forward, also useful for testing with stubs/fakes

### resilient#unmock()

Disable the mock/fake mode

### resilient#on(event, handler)

Subscribe to an event. See [supported events](#events)

### resilient#off(event, handler)

Unsubscribe a given event and its handler. See [supported events](#events)

### resilient#once(event, handler)

Subscribe to an event with a given handler just once time.
After fired, the handler will be removed

See [supported events](#events)

### resilient#flushCache()

Force to flush servers cache

### resilient#client()
Return: `Client` Alias: `http`

Returns an HTTP client-only interface.
Useful to provide encapsulation from public usage and
avoid resilient-specific configuration methods to be called from the public API.

This is a restricted API useful to provide for high-level developers

### resilient.VERSION
Type: `string`

Current semver library version

### resilient.CLIENT_VERSION
Type: `string`

Current semver HTTP client library version

It uses [request](https://github.com/request/request) in node.js and [lil-http](https://github.com/lil-js/http) in the browser

### resilient.defaults
Type: `object`

Default config options

### resilient.Options(options)

Create a new options store

### resilient.Client(resilient)

Creates a new resilient HTTP client with public API

Useful to provide encapsulation to the resilient API and expose only the HTTP client (the common interface the developers want to consum)

### resilient.request(options [, cb])

Use the plain HTTP client

## FAQ

#### It's required to have discovery servers in my infraestructure in order to use Resilient?

Definitely not. Discovery servers only will be used in the case that you configure them in your Resilient client, therefore
if in your project backend infrastructure does not have them, Resilient will simply not use them

#### Can I use Resilient as a simple HTTP client without balancing?

Yes. If your perform a request with a full URI schema, Resilient will avoid to apply any internal balacing logic
and it will treat the request directly

```js
var client = Resilient({
  service: {
    servers: ['http://server1.me', 'http://server2.me']
  }
})

// direct plain request (no balancing, no discovery, no fallback...)
client.get('http//custom.server/hello', function (err, res) {
  // ...
})

// resilient powered request (with balancing, fallback, discovery server, cache...)
client.get('/hello', function (err, res) {
  // ...
})
```

#### Can I use a custom HTTP client instead of the embedded one?

Of course you can do that. In browser environments this is a common premise, for example you need to use the custom HTTP client of the framework you are using in your application, or a custom library like zepto or jQuery that provides a well-know AJAX features

You could simple do that defining a function middleware with which all the HTTP communication will be handled

```js
var client = Resilient({})
// example using Zepto.js AJAX interface
client.useHttpClient(function httpProxy(options, cb) {
  options.success = function (data, status, xhr) {
    cb(null, { status: xhr.status, data: data, xhr: xhr })
  }
  options.error = function (xhr) {
    cb({ status: xhr.status, xhr: xhr })
  }
  $.ajax(options)
})
```

For more information, see the [API method documentation](#resilientusehttpclientfn)

## Contributing

Wanna help? Cool! It will be appreciated :)

You must add new test cases for any new feature or refactor you do,
always following the same design/code patterns that already exist

### Development

Only [node.js](http://nodejs.org) is required for development

Clone the repository
```bash
$ git clone https://github.com/resilient-http/resilient.js.git && cd resilient.js
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

Run tests (in both node.js and headless browser)
```bash
$ make test
```

Run tests in real browsers
```bash
$ make test-browser
```

## License

[MIT](http://opensource.org/licenses/MIT) © Tomas Aparicio and contributors

[travis]: http://travis-ci.org/resilient-http/resilient.js
[httpMessage]: http://nodejs.org/api/http.html#http_http_incomingmessage
