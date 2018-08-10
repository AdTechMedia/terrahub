# terrahub run

```
Usage: terrahub run [options]

terrahub@0.0.1 (built: 2018-04-07T19:15:39.787Z)
this command will execute automated workflow terraform init > workspace > plan > apply > destroy

Options:
  --apply, -a 		 Enable apply command as part of automated workflow
  --destroy, -d 	 Enable destroy command as part of automated workflow
  --auto-approve, -y 	 Auto approve terraform execution
  --include, -i 	 List of components to include
  --exclude, -x 	 List of components to exclude
  --var, -r 		 Variable(s) to be used by terraform
  --var-file, -l 	 Variable file(s) to be used by terraform
  --env, -e 		 Workspace environment
  --help, -h 		 Show list of available commands
```


## Return
Back to [all commands](../commands.md)