# CI Execution Mode

The repository uses the normal quality workflow as the primary production verification path. Experimental diagnostic workflows must be manual-only and must not create additional push-triggered CI load.

A runner/bootstrap failure with `steps: null` is treated as CI infrastructure evidence, not as an application failure. No application code should be changed until a diagnostic job reaches its first step.
