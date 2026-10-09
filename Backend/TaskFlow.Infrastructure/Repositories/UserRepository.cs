using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using TaskFlow.Application.Exceptions;
using TaskFlow.Domain.Entities;
using TaskFlow.Domain.Interfaces;
using TaskFlow.Domain.Queries;
using TaskFlow.Infrastructure.Context;

namespace TaskFlow.Infrastructure.Repositories;

public class UserRepository : IUserRepository
{
    private readonly AppDbContext _context;

    public UserRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<User?> GetByIdAsync(Guid id)
    {
        return await _context.Users.FindAsync(id);
    }

    public async Task<PagedResult<User>> SearchAsync(string? query, int page, int pageSize)
    {
        IQueryable<User> users = _context.Users.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(query))
            users = users.Where(user => user.Name.Contains(query) || user.Email.Contains(query));

        var totalCount = await users.CountAsync();
        var items = await users.OrderBy(user => user.Name).ThenBy(user => user.Id)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return new PagedResult<User>(items, totalCount);
    }

    public async Task<User?> GetByEmailAsync(string email)
    {
        return await _context.Users.AsNoTracking().FirstOrDefaultAsync(user => user.Email == email);
    }

    public async Task AddAsync(User user)
    {
        await _context.Users.AddAsync(user);
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException { Number: 2601 or 2627 })
        {
            throw new ResourceConflictException("Email já cadastrado.");
        }
    }
}
