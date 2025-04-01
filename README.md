# workhorse
# [try it out](https://hyrfilm.github.io/workhorse)

## persistent task queue for the browser
Depending on your use-case can be configured with various forms of guarentees:
* once-and-only-once execution
* guaranteed ordering
* transactional (full ACID-support)
* Fully in-memory taskquees or using the high performance file system (OPFS)
* extensively property / fuzz testing in regards to concurrency (deadlocks, race-conditions etc)
* performance: tested with a concurrency settings up a setting of 1000 consumers (eg a 1000 simulatanous uploads/downloads)
* observability
* extensibility in terms of plugins

Implemented using SQLite running in webworkers.

## brief overview
```mermaid
graph TD
    %% User Interaction
    API["API (queue, poll, run, requeue, getStatus, startPoller, stopPoller, shutdown)"]

    API --> Workhorse
    Workhorse --> Config
    Config["Config (defaultOptions)"]

    %% Workhorse Components
    Workhorse["Workhorse"] --> Dispatcher
    Dispatcher --> TaskQueue
    Dispatcher --> ExecutorPool
    Dispatcher --> PluginHandler

    %% Executor and Queue Interaction
    ExecutorPool --> Executor
    Executor --> TaskQueue
    TaskQueue --> Database["runQuery createDatabase"]
    Database --> nodesqlite["better-sqlite3"]
    Database --> sqlocal["sqlocal"]
    sqlocal --> Webworker
    Webworker --> sqlite3.wasm
    nodesqlite --> sqlite3["in-memory database when testing"]

    %% Plugins
    PluginHandler["Plugin Handler"] --> Plugins["Plugins (PauseWhenOffline, etc.)"]

    %% Task Lifecycle State Flow
    subgraph Task Lifecycle
        queued --> executing
        executing --> successful
        executing --> failed
        failed --> queued
    end

    %% Utilities and Helpers
    Config --> Defaults["Defaults & Factories"]
    Defaults --> Factories["Factories"]

    %% Component Grouping
    classDef core fill:#aef,stroke:#058,stroke-width:2px
    class API,Workhorse,Dispatcher,ExecutorPool,Executor,TaskQueue,SQLiteStorage,XStateMachines,PluginHandler core
```
