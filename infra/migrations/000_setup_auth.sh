#!/usr/bin/env bash
find /var/lib/postgresql -name pg_hba.conf -exec sed -i 's/scram-sha-256/trust/g' {} +
