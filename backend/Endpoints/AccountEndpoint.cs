using System;
using backend.Common;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace backend.Endpoints;

public static class AccountEndpoint
{
    public static RouteGroupBuilder MapAccountEndpoint(this WebApplication app)
    {
        var group = app.MapGroup("/api/account").WithTags("account");

        group.MapPost("/register", async (HttpContext context, UserManager<AppUser>
        UserManager, [FromForm] string fullName, [FromForm] string email, [FromForm] string password,
        [FromForm] string userName, [FromForm] IFormFile? profileImage) =>
        {
            var userFromDb = await UserManager.FindByEmailAsync(email);

            if (userFromDb != null)
            {
                return Results.BadRequest(Response<string>.Failure("User already exists."));
            }
            if (profileImage == null)
            {
                return Results.BadRequest(Response<string>.Failure("image is required"));
            }

            var picture = await FileUpload.Upload(profileImage);
            picture = $"{context.Request.Scheme}://{context.Request.Host}/uploads/{picture}";

            var user = new AppUser
            {
                Email = email,
                FullName = fullName,
                UserName = userName,
                ProfileImage = picture
            };

            var result = await UserManager.CreateAsync(user, password);

            if (!result.Succeeded)
            {
                return Results.BadRequest(Response<string>.Failure(result.Errors.Select(x => x.Description).FirstOrDefault()!));
            }

            return Results.Ok(Response<string>.Success("", "User created Successfully!"));
        }).DisableAntiforgery();

        return group;
    }
}
