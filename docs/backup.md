# Backup do banco do Task Flow

Os dados do SQL Server ficam no volume `sqlserver_data`. `docker compose down` preserva esse volume, mas `docker compose down --volumes` ou a exclusão do volume apaga o banco. Para guardar uma cópia fora do Docker, com os serviços em execução, use PowerShell na raiz do projeto:

```powershell
docker compose exec -T sqlserver mkdir -p /var/opt/mssql/backup
@'
BACKUP DATABASE [TaskFlowDb]
TO DISK = N'/var/opt/mssql/backup/TaskFlowDb.bak'
WITH INIT, CHECKSUM;
GO
RESTORE VERIFYONLY FROM DISK = N'/var/opt/mssql/backup/TaskFlowDb.bak';
GO
'@ | docker compose exec -T sqlserver sh -c 'export SQLCMDPASSWORD="$MSSQL_SA_PASSWORD"; exec /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -C -b'
$backupFile = Join-Path ([Environment]::GetFolderPath('Desktop')) 'TaskFlowDb.bak'
docker compose cp sqlserver:/var/opt/mssql/backup/TaskFlowDb.bak $backupFile
```

Confirme que o arquivo foi copiado antes de remover o volume. O comando substitui um backup anterior com o mesmo nome; guarde as cópias necessárias em outro local. A [documentação da Microsoft](https://learn.microsoft.com/en-us/sql/linux/tutorial-restore-backup-in-sql-server-container?view=sql-server-ver16) explica como restaurar um `.bak` em um contêiner SQL Server.
