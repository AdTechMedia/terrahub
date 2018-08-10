# aws_rds_cluster

Provides an RDS Cluster Resource. A Cluster Resource defines attributes that are applied to the entire cluster of RDS Cluster Instances. Use the RDS Cluster resource and RDS Cluster Instances to create and use Amazon Aurora, a MySQL-compatible database engine.

For more information on Amazon Aurora, see Aurora on Amazon RDS in the Amazon RDS User Guide.

For information on the difference between the available Aurora MySQL engines see Comparison between Aurora MySQL 1 and Aurora MySQL 2 in the Amazon RDS User Guide.

Changes to a RDS Cluster can occur when you manually change a parameter, such as port, and are reflected in the next maintenance window. Because of this, Terraform may report a difference in its planning phase because a modification has not yet taken place. You can use the apply_immediately flag to instruct the service to apply the change immediately (see documentation below).

Note: using apply_immediately can result in a brief downtime as the server reboots. See the AWS Docs on RDS Maintenance for more information.

Note: All arguments including the username and password will be stored in the raw state as plain-text. Read more about sensitive data in state.

## input variables

| Name | Description | Type | Default | Required |
|------|-------------|:----:|:-----:|:-----:|
|account_id|The id of AWS account.|string||Yes|
|region|This is the AWS region.|string|us-east-1|Yes|
|rds_cluster_identifier|The cluster identifier. If omitted, Terraform will assign a random, unique identifier.|string|{{ name }}|No|
|rds_cluster_engine|The name of the database engine to be used for this DB cluster. Defaults to aurora. Valid Values: aurora, aurora-mysql, aurora-postgresql|string|aurora-postgresql|No|
|rds_cluster_availability_zones|A list of EC2 Availability Zones that instances in the DB cluster can be created in.|list|"us-east-1a","us-east-1b","us-east-1c"|No|
|rds_cluster_database_name|Name for an automatically created database on cluster creation. There are different naming restrictions per database engine: RDS Naming Constraints.|string|{{ name }}_db|No|
|rds_cluster_master_username|Username for the master DB user. Please refer to the RDS Naming Constraints.|string|root|No|
|rds_cluster_master_password|Password for the master DB user. Note that this may show up in logs, and it will be stored in the state file. Please refer to the RDS Naming Constraints.|string|root!root|No|
|rds_cluster_backup_retention_period|The days to retain backups for.|number|5|No|
|rds_cluster_preferred_backup_window|The daily time range during which automated backups are created if automated backups are enabled using the BackupRetentionPeriod parameter.|string|07:00-09:00|No|
|rds_cluster_skip_final_snapshot|Determines whether a final DB snapshot is created before the DB cluster is deleted. If true is specified, no DB snapshot is created. If false is specified, a DB snapshot is created before the DB cluster is deleted, using the value from final_snapshot_identifier.|booolean|false|No|
|rds_cluster_backtrack_window|The target backtrack window, in seconds. Only available for aurora engine currently. |number|0|No|
|rds_cluster_storage_encrypted|Specifies whether the DB cluster is encrypted.|boolean|false|No|
|rds_cluster_apply_immediately|Specifies whether any cluster modifications are applied immediately, or during the next maintenance window.|boolean|false|No|
|custom_tags|Custom tags.|map||No|
|default_tags|Default tags.|map|{"ThubName"= "{{ name }}","ThubCode"= "{{ code }}","ThubEnv"= "default","Description" = "Managed by TerraHub"}|No|

## output parameters

| Name | Description | Type |
|------|-------------|:----:|
|id|The RDS Cluster Identifier.|string|
|thub_id|The RDS Cluster Identifier (hotfix for issue hashicorp/terraform#[7982]).|string|
|cluster_identifier|The RDS Cluster Identifier|string|
|cluster_resource_id|The RDS Cluster Resource ID|string|
|cluster_members|List of RDS Instances that are a part of this cluster|string|
|allocated_storage|The amount of allocated storage|string|
|availability_zones|The availability zone of the instance|string|
|backup_retention_period|The backup retention period|string|
|preferred_backup_window|The daily time range during which the backups happen|string|
|preferred_maintenance_window|The maintenance window|string|
|endpoint|The DNS address of the RDS instance|string|
|reader_endpoint|A read-only endpoint for the Aurora cluster, automatically load-balanced across replicas|string|
|engine|The database engine|string|
|engine_version|The database engine version|string|
|maintenance_window|The instance maintenance window|string|
|database_name|The database name|string|
|port|The database port|string|
|status|The RDS instance status|string|
|master_username|The master username for the database|string|
|storage_encrypted|Specifies whether the DB cluster is encrypted|string|
|replication_source_identifier|ARN of the source DB cluster or DB instance if this DB cluster is created as a Read Replica.|string|
|hosted_zone_id|The Route53 Hosted Zone ID of the endpoint|string|