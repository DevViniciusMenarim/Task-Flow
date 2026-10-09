using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TaskFlow.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class SetUserEmailCaseInsensitive : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Hold an exclusive lock until the migration commits so another write cannot
            // introduce a duplicate between this check and the replacement unique index.
            migrationBuilder.Sql("""
                IF EXISTS (
                    SELECT 1
                    FROM [Users] WITH (TABLOCKX, HOLDLOCK)
                    GROUP BY [Email] COLLATE Latin1_General_100_CI_AS
                    HAVING COUNT_BIG(*) > 1
                )
                    THROW 51000, N'Existem emails duplicados sem diferenciar maiúsculas de minúsculas. Resolva os conflitos em Users antes de atualizar.', 1;
                """);

            migrationBuilder.DropIndex(
                name: "IX_Users_Email",
                table: "Users");

            migrationBuilder.AlterColumn<string>(
                name: "Email",
                table: "Users",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: false,
                collation: "Latin1_General_100_CI_AS",
                oldClrType: typeof(string),
                oldType: "nvarchar(150)",
                oldMaxLength: 150);

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Users_Email",
                table: "Users");

            migrationBuilder.AlterColumn<string>(
                name: "Email",
                table: "Users",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(150)",
                oldMaxLength: 150,
                oldCollation: "Latin1_General_100_CI_AS");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);
        }
    }
}
