using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TaskFlow.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTaskRowVersionAndUserSearch : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                table: "Tasks",
                type: "rowversion",
                rowVersion: true,
                nullable: false);

            migrationBuilder.CreateIndex(
                name: "IX_Users_Name_Id",
                table: "Users",
                columns: new[] { "Name", "Id" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Users_Name_Id",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                table: "Tasks");
        }
    }
}
