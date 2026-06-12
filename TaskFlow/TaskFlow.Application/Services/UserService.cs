using TaskFlow.Application.DTOs;
using TaskFlow.Application.Interfaces;
using TaskFlow.Domain.Entities;
using TaskFlow.Domain.Interfaces;

namespace TaskFlow.Application.Services;

public class UserService : IUserService
{
    private readonly IUserRepository _repository;

    public UserService(IUserRepository repository)
    {
        _repository = repository;
    }

    public async Task<UserResponseDTO> CreateAsync(CreateUserDTO dto)
    {
        var user = new User(dto.Name, dto.Email);
        await _repository.AddAsync(user);
        return new UserResponseDTO(user.Id, user.Name, user.Email);
    }

    public async Task<IEnumerable<UserResponseDTO>> GetAllAsync()
    {
        var users = await _repository.GetAllAsync();
        return users.Select(u => new UserResponseDTO(u.Id, u.Name, u.Email));
    }

    public async Task<UserResponseDTO?> GetByIdAsync(Guid id)
    {
        var user = await _repository.GetByIdAsync(id);
        if (user == null) return null;
        return new UserResponseDTO(user.Id, user.Name, user.Email);
    }
}