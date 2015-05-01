# Summary

Some tools to help test different deployments with different configurations and compare their performance using various
KPIs such as disk/network/cpu and your own custom metrics. It's helpful because it you can define a fairly static
configuration with your test variables, and then this will create separate deployments in a scenario matrix. It's really
just a working prototype... it should probably be cleaned up if we get serious and end up using this often.

It's probably easiest if you just look at the example we first used when testing this:

 * [Test Suite source](./examples/prelim-large-flush-compare)
 * [scenario3/trial1/elasticsearch-0](https://ci-logsearch.s3.amazonaws.com/github-public/bosh-performance-tests/masterish/web/graph-presets.html#../../examples/prelim-large-flush-compare/scenario3/trial1/metrics/elasticsearch-0.data)
 * [Compare Metrics](https://ci-logsearch.s3.amazonaws.com/github-public/bosh-performance-tests/masterish/web/compare.html#../../examples/prelim-large-flush-compare)
 * [Custom Graphs](https://ci-logsearch.s3.amazonaws.com/github-public/bosh-performance-tests/masterish/web/custom.html#../../examples/prelim-large-flush-compare/scenario3/trial1/metrics/elasticsearch-0.data)


# Test Suite

Your test suite will contain a `config.yml` describing your suite, a `bosh.yml` describing your deployment, and may
also include configuration files and deployment-specific scripts. To get started, make a folder for your suite to hold
your files...

    mkdir suite/flush-size
    cd suite/flush-size

The `config.yml` has a few sections:

 * `trials` - this holds an integer value describing how many times you'll run each configuration
 * `variables` - this holds all the settings you want to change/test. Each key represents a change and the array of
   values are the options to test.
 * `settings` - set whatever you like here, but be sure `logsearch.{api|ingestor|ssl_ca_certificate}` are specified so
   it can inject them into your test manifest.
 * `steps` - the list of commands to run. The `custom` ones are executed from your test suite's `bin` directory; all
   the other ones are executed from the respective shared `bin` directory.

Once you have this set up, you will run `./bin/command/create-plan {test-suite} {generated-tests}`...

    $ ./bosh-performance-tests/bin/create-plan suite/flush-size executions/flush-size-20150430a

The script will make a copy of your suite for each scenario and trial necessary. It will overwrite `config.yml` with
your test-specific parameters and it will write out some environment variables that your test will use.

Your scripts and `bosh.yml` will have access to environment variables made available through any scripts added to your
suite's `env` directory, but the following will also be made available during and after the trial runs.

  * `MVTJ_` - IPs and CIDs of running BOSH jobs available after deploy (e.g. `MVTJ_QUEUE_0=192.0.2.1`, `MVTJ_QUEUE_0_CID=i-2a82a0cd`)
  * `MVTS_` - static settings (e.g. `MVTS_LOGSEARCH_API=api.logsearch.example.com:9200`)
  * `MVTV_` - variable settings (e.g. `MVTV_ELASTICSEARCH_INSTANCE_TYPE=r3.xlarge`)
  * `MVTT_` - timer values (e.g. `MVTT_START=2015-04-24T16:35:22Z`)

The `steps` in your `config.yml` will probably be structured something like this:

    steps:
      # create your deployment to test against
      - bosh: deploy
      
      # then run any errands or custom setup scripts you need
      - custom: put-elasticsearch-template
      
      # then mark a "start" time to indicate when its relevant to pay attention
      - util: timer-mark
        args: start
      
      # sleep for a few minutes to let the machine quiet down from startup processes
      # useful for clearly separating metrics and logs from when the test is actually running
      - util: sleep
        args: 350
      
      # run your actual tests against the deployment; do whatever you like here
      - custom: push-test-logs
      - custom: wait-for-queue
      
      # sleep again for the tail end of quieting things down
      - util: sleep
        args: 360
      
      # record the stop time
      - util: timer-mark
        args: stop
      
      # then you'll want to start dumping metrics for later analysis
      # logsearch for host and logsearch-shipper generated metrics, aws for cloudwatch stats from the jobs/disks
      - logsearch: dump-metrics
      - custom: dump-custom-metrics
      - aws: dump-metrics
      
      # then cleanup after yourself
      - bosh: destroy

Once you've created a specific test plan from your suite, change into the scenario and trial directory and run
`bin/command/run`.

    $ cd flush-size-20150430a/scenario1/trial1
    $ ./bin/command/run

After it's done, make educated decisions from comparing your test results. You might like the some of the stuff in the
`web` directory for visually comparing the metrics.


# Web

There are a few files. They're primitive. They're messy. They're inefficient. They work.

**`compare.html`** - point this to your executed test suite directory via URL fragment (e.g.
`compare.html#/flush-size-20150430a`) and then compare any of the job metrics from your scenarios and trials side by
side.

**`graph-presets.html`** a precomposed dashboard with some graphs we've found useful. Point it to one of your scenario
and trial's metric files in the URL fragment.

**`custom.html`** - experiment with your own graph definitions with one or more metric files. Again, use the URL
fragment to reference your files.

The graphs are all computed within the browser, so don't be benchmarking the performance. The custom page has an example
and minimal docs about the functions (*heavily* inspired by Graphite's docs and my limited understanding) you can use to
compose graphs from the data.


# Metric Files

The logsearch and aws are dumping their metrics in a... something format. The metrics needed to be recorded in a
persistent way (one not requiring a running logsearch/graphite/server), and I knew most interaction was going to be
done via web frontend so minimizing dozens of file transfers was important, and I hate keeping/committing unnecessarily
large files... so they're sort of compressed. If I were a metrics person and this were more than a prototype, I might
know a more official format to reuse.

Each line is a metric with a stream of values which looks like:

    metric.key.name 1430094778:49.0;30;30:50.0;30;30:51.0

The key name is self-explanatory (periods are used only for logical namespacing). Everything after it is
semicolon-separated into measured values. Each of those values are then colon-separated for seconds since last
measurement and, optionally, the new metric value. Details:

 * the first value must always have both the seconds (in UTC) and metric value; `{epoch}:{value}`
 * a changed value will be `{seconds}:{value}`
 * an unchanged value will just be `{seconds}`
 * an unmeasureable value will just be `{seconds}:`

In the above example, the `metric.key.name` had the following measurements, where it increased once every minute:

    2015-04-27T00:32:58Z  49.0
    2015-04-27T00:33:28Z  49.0
    2015-04-27T00:33:58Z  50.0
    2015-04-27T00:34:28Z  50.0
    2015-04-27T00:34:58Z  51.0

