using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web.Http;

namespace aspnet.Controllers
{
    public class ContactController : ApiController
    {
        [Authorize]
        public string Get()
        {
            return "Yo yo";
        }

        [Authorize]
        public string Post()
        {
            return "Whats up";
        }
    }

    public class Contact
    {
        public int ID { get; set; }
        public string Name { get; set; }
    }
}
