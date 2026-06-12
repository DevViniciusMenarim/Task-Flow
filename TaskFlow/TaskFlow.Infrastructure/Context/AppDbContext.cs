using Microsoft.EntityFrameworkCore;
using TaskFlow.Domain.Entities;

namespace TaskFlow.Infrastructure.Context;

public class AppDbContext : DbContext
{
      public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
      {
      }

      public DbSet<User> Users { get; set; }
      public DbSet<TaskItem> Tasks { get; set; }

      protected override void OnModelCreating(ModelBuilder modelBuilder)
      {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<User>(entity =>
            {
                  entity.HasKey(u => u.Id);

                  entity.Property(u => u.Name)
                    .IsRequired()
                    .HasMaxLength(100);

                  entity.Property(u => u.Email)
                    .IsRequired()
                    .HasMaxLength(150);

                  entity.HasIndex(u => u.Email).IsUnique();
            });

            modelBuilder.Entity<TaskItem>(entity =>
            {
                  entity.HasKey(t => t.Id);

                  entity.Property(t => t.Title)
                    .IsRequired()
                    .HasMaxLength(200);

                  entity.Property(t => t.Description)
                    .HasMaxLength(1000);

                  entity.HasOne(t => t.User)
                    .WithMany(u => u.Tasks)
                    .HasForeignKey(t => t.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });
      }
}