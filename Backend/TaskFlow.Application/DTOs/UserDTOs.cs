using System.ComponentModel.DataAnnotations;
using TaskFlow.Domain;

namespace TaskFlow.Application.DTOs;

public record CreateUserDTO(
    [param: Required, StringLength(FieldRules.UserNameMaxLength)] string Name,
    [param: Required, StringLength(FieldRules.UserEmailMaxLength), EmailAddress] string Email);
public record UserResponseDTO(Guid Id, string Name, string Email);

public record PagedUsersDTO(IReadOnlyList<UserResponseDTO> Items, int Page, int PageSize,
    int TotalCount, int TotalPages);
