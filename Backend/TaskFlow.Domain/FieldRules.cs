using System.ComponentModel.DataAnnotations;

namespace TaskFlow.Domain;

public static class FieldRules
{
    public const int TaskTitleMaxLength = 200;
    public const int TaskDescriptionMaxLength = 1000;
    public const int SubtaskTitleMaxLength = 200;
    public const int UserNameMaxLength = 100;
    public const int UserEmailMaxLength = 150;

    public static string? NormalizeRequiredText(string? value, int maxLength)
    {
        var cleaned = value?.Trim();
        return !string.IsNullOrWhiteSpace(cleaned) && cleaned.Length <= maxLength
            ? cleaned
            : null;
    }

    public static bool IsValidEmail(string value) => new EmailAddressAttribute().IsValid(value);
}
