using Microsoft.Owin;
using Newtonsoft.Json;
using Owin;
using System;
using System.IdentityModel.Claims;
using System.Security.Cryptography;
using System.Security.Principal;
using System.Text;
using System.Threading.Tasks;

[assembly: OwinStartup(typeof(aspnet.Startup))]

namespace aspnet
{
    public class Startup
    {
        public void Configuration(IAppBuilder app)
        {
            //
            //  For some reason, the native .NET UseJwtBearerAuthentication does not work with JWT tokens created by NodeJS
            //  So we manually verifies the token
            //
            app.Use(CustomJwtBearerAuthentication);
        }

        public static Task CustomJwtBearerAuthentication(IOwinContext context, Func<Task> next)
        {
            var token = context.Request.Headers["Authorization"];

            if (token != null && token.StartsWith("Bearer "))
            {
                var parts = token.Substring("Bearer ".Length).Split('.');
                if (parts.Length == 3)
                {
                    var headerb64 = parts[0];
                    var claimsb64 = parts[1];
                    var sigb64 = parts[2];

                    //
                    //  Verify signature
                    //
                    var payload = headerb64 + "." + claimsb64;
                    byte[] key = Encoding.UTF8.GetBytes("MYSECRET");
                    byte[] message = Encoding.UTF8.GetBytes(payload);
                    string sig = ToBase64(HashHMAC(key, message));

                    if (sig == sigb64)
                    {
                        var claims = FromBase64(parts[1]);

                        UserDetails user = JsonConvert.DeserializeObject<UserDetails>(claims);
                        context.Request.User = new GenericPrincipal(new GenericIdentity(user.email), new string[0]);
                    }
                }
            }

            return next();
        }

        private static string ToBase64(byte[] bytes)
        {
            return Convert.ToBase64String(bytes)
                            .Replace('+', '-')
                            .Replace('/', '_')
                            .Replace("=", "");
        }

        private static string FromBase64(string b64)
        {
            string incoming = b64.Replace('_', '/').Replace('-', '+');
            switch (b64.Length % 4)
            {
                case 2: incoming += "=="; break;
                case 3: incoming += "="; break;
            }
            byte[] bytes = Convert.FromBase64String(incoming);
            string originalText = Encoding.ASCII.GetString(bytes);
            return originalText;
        }

        private static byte[] HashHMAC(byte[] key, byte[] message)
        {
            var hash = new HMACSHA256(key);
            return hash.ComputeHash(message);
        }
    }

    public class UserDetails
    {
        public string name { get; set; }
        public string email { get; set; }
    }
}
