using TaskFlow.Domain;
using TaskFlow.Application.DTOs;
using TaskFlow.Application.Exceptions;
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
        var name = FieldRules.NormalizeRequiredText(dto.Name, FieldRules.UserNameMaxLength);
        var email = FieldRules.NormalizeRequiredText(dto.Email, FieldRules.UserEmailMaxLength);

        if (name is null)
            throw new InvalidRequestException("O nome deve ter entre 1 e 100 caracteres.");

        if (email is null || !FieldRules.IsValidEmail(email))
            throw new InvalidRequestException("Informe um email válido com até 150 caracteres.");

        if (await _repository.GetByEmailAsync(email) is not null)
            throw new ResourceConflictException("Email já cadastrado.");

        var user = new User(name, email);
        await _repository.AddAsync(user);
        return new UserResponseDTO(user.Id, user.Name, user.Email);
    }

    public async Task<PagedUsersDTO> SearchAsync(string? query, int page, int pageSize)
    {
        var cleaned = query?.Trim();
        if (cleaned?.Length > 150)
            throw new InvalidRequestException("A busca deve ter no máximo 150 caracteres.");
        if (page < 1 || pageSize is < 1 or > 100 ||
            (long)(page - 1) * pageSize > int.MaxValue)
            throw new InvalidRequestException("Página ou tamanho de página inválido.");

        var result = await _repository.SearchAsync(cleaned, page, pageSize);
        return new PagedUsersDTO(result.Items.Select(ToResponse).ToArray(), page, pageSize,
            result.TotalCount, (int)Math.Ceiling((double)result.TotalCount / pageSize));
    }

    public async Task<UserResponseDTO?> GetByIdAsync(Guid id)
    {
        var user = await _repository.GetByIdAsync(id);
        if (user == null) return null;
        return ToResponse(user);
    }

    private static UserResponseDTO ToResponse(User user) => new(user.Id, user.Name, user.Email);
}
