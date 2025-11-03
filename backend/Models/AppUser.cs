using System;
using Microsoft.AspNetCore.Identity;

namespace backend.Models;

public class AppUser : IdentityUser
{
    public string? FullName { get; set; }
    public string? ProfileImage { get; set; }

}
