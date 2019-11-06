const db = require("_helpers/db"),
  express = require("express"),
  app = express(),
  request = require("request");
(csvParser = require("csv-parse")), (fs = require("fs"));
(Practise = db.Practise), (Taxonomy = db.Taxonomy), (Address = db.Address);
(crypto = require("crypto")), (algorithm = "aes-256-cbc");
let key = "abcdefghijklmnopqrstuvwxyztgbhgf";
let iv = "1234567891234567";
let filePathForDoctors = "./doctor/doctors.csv";
let Jwt = require("../_helpers/jwt");
var jwt = require("jsonwebtoken");
let Scheduler = require("./availability.controller");
//Function to upload the CPT codes from the CSV file to the MongoDb Database
function addDoctors(req, res) {
  //Reading the File
  fs.readFile(
    filePathForDoctors,
    {
      encoding: "utf-8"
    },
    async function(err, csvData) {
      if (err) {
        console.log(err);
      }

      csvParser(
        csvData,
        {
          delimiter: ","
        },
        async function(err, data) {
          if (err) {
            console.log(err);
          } else {
            data.map(el => {
              //Requesting the Info of the doctor from the NPI Database
              const NPIApi =
                `https://npiregistry.cms.hhs.gov/api/?number=` +
                el +
                `&version=2.0`;

              request.get(NPIApi, async function(err, resp, body) {
                let doctorInfoq = JSON.parse(resp.body);
                let doctorInfo = doctorInfoq.results[0];
                //Checking if the Doctor Already exists
                let ifExists = await Practise.findOne({
                  npi: doctorInfo.number
                });

                if (ifExists) {
                  console.log("A Doctor with this NPI Number already exists");
                } else {
                  let addressArray = [];
                  if (doctorInfo.addresses) {
                    doctorInfo.addresses.map(el => {
                      let address = new Address({
                        country_code: el.country_code,
                        country_name: el.country_name,
                        address_purpose: el.address_purpose,
                        address_type: el.address_type,
                        address_1: el.address_1,
                        address_2: el.address_2,
                        city: el.city,
                        state: el.state,
                        postal_code: el.postal_code,
                        telephone_number: el.telephone_number
                      });
                      address.save().catch(console.log);
                      addressArray.push(address._id);
                    });
                  }

                  let practiceLocationsArray = [];
                  if (doctorInfo.practiceLocations) {
                    doctorInfo.practiceLocations.map(el => {
                      let address = new Address({
                        country_code: el.country_code,
                        country_name: el.country_name,
                        address_purpose: el.address_purpose,
                        address_type: el.address_type,
                        address_1: el.address_1,
                        address_2: el.address_2,
                        city: el.city,
                        state: el.state,
                        postal_code: el.postal_code,
                        telephone_number: el.telephone_number
                      });
                      address.save().catch(console.log);
                      practiceLocationsArray.push(address._id);
                    });
                  }

                  let taxonomiesArray = [];
                  if (doctorInfo.taxonomies) {
                    doctorInfo.taxonomies.map(el => {
                      let taxonomies = new Taxonomy({
                        code: el.code,
                        desc: el.desc,
                        primary: el.primary,
                        state: el.state,
                        licence: el.licence,
                        taxonomy_group: el.taxonomy_group
                      });
                      taxonomies.save().catch(console.log);
                      taxonomiesArray.push(taxonomies._id);
                    });
                  }

                  let basic = {};
                  let doctorInfoBasic = doctorInfo.basic;
                  basic.organization_name = doctorInfoBasic.organization_name
                    ? doctorInfoBasic.organization_name
                    : "not found";
                  basic.organizational_subpart = doctorInfoBasic.organizational_subpart
                    ? doctorInfoBasic.organizational_subpart
                    : "not found";
                  basic.enumeration_date = doctorInfoBasic.enumeration_date
                    ? doctorInfoBasic.enumeration_date
                    : "not found";
                  basic.last_updated = doctorInfoBasic.last_updated
                    ? doctorInfoBasic.last_updated
                    : "not found";
                  basic.status = doctorInfoBasic.status
                    ? doctorInfoBasic.status
                    : "not found";
                  basic.credential = doctorInfoBasic.authorized_official_credential
                    ? doctorInfoBasic.authorized_official_credential
                    : doctorInfoBasic.credential;
                  basic.first_name = doctorInfoBasic.authorized_official_first_name
                    ? doctorInfoBasic.authorized_official_first_name
                    : doctorInfoBasic.first_name;
                  basic.last_name = doctorInfoBasic.authorized_official_last_name
                    ? doctorInfoBasic.authorized_official_last_name
                    : doctorInfoBasic.last_name;
                  basic.middle_name = doctorInfoBasic.authorized_official_middle_name
                    ? doctorInfoBasic.authorized_official_middle_name
                    : doctorInfoBasic.middle_name;
                  basic.telephone_number = doctorInfoBasic.authorized_official_telephone_number
                    ? doctorInfoBasic.authorized_official_telephone_number
                    : "not found";
                  basic.title_or_position = doctorInfoBasic.authorized_official_title_or_position
                    ? doctorInfoBasic.authorized_official_title_or_position
                    : "not found";
                  basic.name_prefix = doctorInfoBasic.name_prefix
                    ? doctorInfoBasic.name_prefix
                    : "not found";
                  basic.name_suffix = doctorInfoBasic.name_suffix
                    ? doctorInfoBasic.name_suffix
                    : "not found";
                  basic.sole_proprietor = doctorInfoBasic.sole_proprietor
                    ? doctorInfoBasic.sole_proprietor
                    : "not found";
                  basic.gender = doctorInfoBasic.gender
                    ? doctorInfoBasic.gender
                    : "not found";
                  basic.name = doctorInfoBasic.name
                    ? doctorInfoBasic.name
                    : "not found";

                  setTimeout(function() {
                    let practise = new Practise({
                      enumerationType: doctorInfo.enumeration_type,
                      npi: doctorInfo.number,
                      last_updated_epoch: doctorInfo.last_updated_epoch,
                      created_epoch: doctorInfo.created_epoch,
                      basic,
                      other_names: doctorInfo.other_names,
                      address: addressArray,
                      taxonomies: taxonomiesArray,
                      practiceLocation: practiceLocationsArray,
                      identifiers: doctorInfo.identifiers
                    });

                    //Saving the Doctor Info
                    practise.save(function(err) {
                      if (err) {
                        console.log({ err });
                        if (err.name === "MongoError" && err.code === 11000) {
                          console.log("This Doctor already exists");
                        }
                      }
                    });
                  }, 3000);
                }
              });
            });
          }
        }
      );
    }
  );
  res.json({ status: true });
}

//API Call to NPI Database with response as parameter
function getNPI(npiNumber, response) {
  const NPIApi =
    `https://npiregistry.cms.hhs.gov/api/?number=` + npiNumber + `&version=2.0`;

  request.get(NPIApi, function(err, res, body) {
    const doctorInfo = JSON.parse(res.body);
    response.json({ status: true, doctorInfo });
  });
}

//API Call to NPI Database without response as parameter
function getNPIWithNumber(npiNumber) {
  const NPIApi =
    `https://npiregistry.cms.hhs.gov/api/?number=` + npiNumber + `&version=2.0`;

  request.get(NPIApi, function(err, res, body) {
    const doctorInfo = JSON.parse(res.body);
    console.log(doctorInfo);
    return doctorInfo;
  });
}

//Endpoint to fetch the info through a NPI Number
function getNpiInfo(req, res) {
  console.log(req.params.npi);
  if (req.params.npi) {
    getNPI(req.params.npi, res);
  } else {
    res.json({ status: false, error: "Please enter a NPI Number" });
  }
}

//Functiont to list all the doctors
function getAllDoctors(req, res) {
  Practise.find()
    .populate("taxonomies")
    .populate("address")
    .then(data => res.json({ status: true, data }))
    .catch(error => res.json({ status: false, error }));
}

//Sign up new doctor through API
signUpDoc = (req, res) => {
  let addressArray = [];
  if (req.body.addresses) {
    req.body.addresses.map(el => {
      let address = new Address({
        country_code: el.country_code,
        country_name: el.country_name,
        address_purpose: el.address_purpose,
        address_type: el.address_type,
        address_1: el.address_1,
        address_2: el.address_2,
        city: el.city,
        state: el.state,
        postal_code: el.postal_code,
        telephone_number: el.telephone_number
      });
      address.save().catch(console.log);
      addressArray.push(address._id);
    });
  }

  let practiceLocationsArray = [];
  if (req.body.practiceLocations) {
    req.body.practiceLocations.map(el => {
      let address = new Address({
        country_code: el.country_code,
        country_name: el.country_name,
        address_purpose: el.address_purpose,
        address_type: el.address_type,
        address_1: el.address_1,
        address_2: el.address_2,
        city: el.city,
        state: el.state,
        postal_code: el.postal_code,
        telephone_number: el.telephone_number
      });
      address.save().catch(console.log);
      practiceLocationsArray.push(address._id);
    });
  }

  let taxonomiesArray = [];
  if (req.body.taxonomies) {
    req.body.taxonomies.map(el => {
      let taxonomies = new Taxonomy({
        code: el.code,
        desc: el.desc,
        primary: el.primary,
        state: el.state,
        licence: el.licence,
        taxonomy_group: el.taxonomy_group
      });
      taxonomies.save().catch(console.log);
      taxonomiesArray.push(taxonomies._id);
    });
  }

  let basic = {};
  let doctorInfoBasic = req.body.basic;
  basic.organization_name = doctorInfoBasic.organization_name
    ? doctorInfoBasic.organization_name
    : "not found";
  basic.organizational_subpart = doctorInfoBasic.organizational_subpart
    ? doctorInfoBasic.organizational_subpart
    : "not found";
  basic.enumeration_date = doctorInfoBasic.enumeration_date
    ? doctorInfoBasic.enumeration_date
    : "not found";
  basic.last_updated = doctorInfoBasic.last_updated
    ? doctorInfoBasic.last_updated
    : "not found";
  basic.status = doctorInfoBasic.status ? doctorInfoBasic.status : "not found";
  basic.credential = doctorInfoBasic.authorized_official_credential
    ? doctorInfoBasic.authorized_official_credential
    : doctorInfoBasic.credential;
  basic.first_name = doctorInfoBasic.authorized_official_first_name
    ? doctorInfoBasic.authorized_official_first_name
    : doctorInfoBasic.first_name;
  basic.last_name = doctorInfoBasic.authorized_official_last_name
    ? doctorInfoBasic.authorized_official_last_name
    : doctorInfoBasic.last_name;
  basic.middle_name = doctorInfoBasic.authorized_official_middle_name
    ? doctorInfoBasic.authorized_official_middle_name
    : doctorInfoBasic.middle_name;
  basic.telephone_number = doctorInfoBasic.authorized_official_telephone_number
    ? doctorInfoBasic.authorized_official_telephone_number
    : "not found";
  basic.title_or_position = doctorInfoBasic.authorized_official_title_or_position
    ? doctorInfoBasic.authorized_official_title_or_position
    : "not found";
  basic.name_prefix = doctorInfoBasic.name_prefix
    ? doctorInfoBasic.name_prefix
    : "not found";
  basic.name_suffix = doctorInfoBasic.name_suffix
    ? doctorInfoBasic.name_suffix
    : "not found";
  basic.sole_proprietor = doctorInfoBasic.sole_proprietor
    ? doctorInfoBasic.sole_proprietor
    : "not found";
  basic.gender = doctorInfoBasic.gender ? doctorInfoBasic.gender : "not found";
  basic.name = doctorInfoBasic.name ? doctorInfoBasic.name : "not found";

  setTimeout(function() {
    let cipher = crypto.createCipheriv(algorithm, new Buffer.from(key), iv);
    var encrypted =
      cipher.update(req.body.password, "utf8", "hex") + cipher.final("hex");
    console.log(encrypted);
    let practise = new Practise({
      enumerationType: req.body.enumeration_type,
      npi: req.body.number,
      last_updated_epoch: req.body.last_updated_epoch,
      created_epoch: req.body.created_epoch,
      basic,
      other_names: req.body.other_names,
      address: addressArray,
      taxonomies: taxonomiesArray,
      practiceLocation: practiceLocationsArray,
      identifiers: req.body.identifiers,
      email: req.body.email,
      password: encrypted,
      steps: [0, 0, 0, 0, 0],
      specialty: req.body.specialty,
      phone: req.body.phone
    });

    //Saving the Doctor Info
    practise.save(function(err, doc) {
      if (err) {
        console.log({ err });
        if (err.name === "MongoError" && err.code === 11000) {
          console.log("This Doctor already exists");
          res.json({
            status: false,
            message: "Doctor with this Npi number already exists"
          });
        }
      } else {
        res.json({
          status: true,
          message: "Successfully Registered",
          data: doc
        });
      }

      // let mailOptions = {
      //   from: '"DocMz"; <admin@docmz.com>',
      //   to: req.body.email,
      //   subject: "Successfully Registered - DocMz",
      //   text: "You've been succesfully registered as a Doctor on DocMz. "
      // html="<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
      {
        /* <html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
  <head>
    <title></title>
    <!--[if !mso]><!-->
    <meta http-equiv="x-ua-compatible" content="IE=edge">
    <!--<![endif]-->
    <meta http-equiv="content-type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <!--[if !mso]><!-->
    <!--<![endif]-->
    <!--[if mso]>
    <xml>
      <o:OfficeDocumentSettings>
        <o:AllowPNG />
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
    <![endif]-->
    <!--[if lte mso 11]>
    <style>
      .outlook-group-fix {
      width:100% !important;
      }
    </style>
    <![endif]-->
    <!--[if !mso]><!-->
    <link href="https://fonts.googleapis.com/css?family=Lato:400,700" rel="stylesheet" type="text/css">
    <!--<![endif]-->
    
  <style type="text/css">
		#outlook a{
			padding:0;
		}
		.ReadMsgBody{
			width:100%;
		}
		.ExternalClass{
			width:100%;
		}
		.ExternalClass *{
			line-height:100%;
		}
		body{
			margin:0;
			padding:0;
			-webkit-text-size-adjust:100%;
			-ms-text-size-adjust:100%;
		}
		table,td{
			border-collapse:collapse;

		}
		img{
			border:0;
			height:auto;
			line-height:100%;
			outline:none;
			text-decoration:none;

		}
		p{
			display:block;
			margin:13px 0;
		}
		#outlook a{
			padding:0;
		}
		.ReadMsgBody{
			width:100%;
		}
		.ExternalClass{
			width:100%;
		}
		.ExternalClass *{
			line-height:100%;
		}
		body{
			margin:0;
			padding:0;
			-webkit-text-size-adjust:100%;
			-ms-text-size-adjust:100%;
		}
		table,td{
			border-collapse:collapse;

		}
		img{
			border:0;
			height:auto;
			line-height:100%;
			outline:none;
			text-decoration:none;

		}
		p{
			display:block;
			margin:13px 0;
		}
	@media only screen and (max-width:480px){
		width:320px{
			width:320px;
		}

}		#outlook a{
			padding:0;
		}
		.ReadMsgBody{
			width:100%;
		}
		.ExternalClass{
			width:100%;
		}
		.ExternalClass *{
			line-height:100%;
		}
		body{
			margin:0;
			padding:0;
			-webkit-text-size-adjust:100%;
			-ms-text-size-adjust:100%;
		}
		table,td{
			border-collapse:collapse;

		}
		img{
			border:0;
			height:auto;
			line-height:100%;
			outline:none;
			text-decoration:none;

		}
		p{
			display:block;
			margin:13px 0;
		}
	@media only screen and (max-width:480px){
		width:320px{
			width:320px;
		}

}		#outlook a{
			padding:0;
		}
		.ReadMsgBody{
			width:100%;
		}
		.ExternalClass{
			width:100%;
		}
		.ExternalClass *{
			line-height:100%;
		}
		body{
			margin:0;
			padding:0;
			-webkit-text-size-adjust:100%;
			-ms-text-size-adjust:100%;
		}
		table,td{
			border-collapse:collapse;

		}
		img{
			border:0;
			height:auto;
			line-height:100%;
			outline:none;
			text-decoration:none;

		}
		p{
			display:block;
			margin:13px 0;
		}
	@media only screen and (max-width:480px){
		width:320px{
			width:320px;
		}

}	@media only screen and (min-width:480px){
		.mj-column-per-100{
			width:100% !important;
			max-width:100%;
		}

}		#outlook a{
			padding:0;
		}
		.ReadMsgBody{
			width:100%;
		}
		.ExternalClass{
			width:100%;
		}
		.ExternalClass *{
			line-height:100%;
		}
		body{
			margin:0;
			padding:0;
			-webkit-text-size-adjust:100%;
			-ms-text-size-adjust:100%;
		}
		table,td{
			border-collapse:collapse;

		}
		img{
			border:0;
			height:auto;
			line-height:100%;
			outline:none;
			text-decoration:none;
		}
		p{
			display:block;
			margin:13px 0;
		}
	@media only screen and (max-width:480px){
		width:320px{
			width:320px;
		}

}	@media only screen and (min-width:480px){
		.mj-column-per-100{
			width:100% !important;
			max-width:100%;
		}

}	@media only screen and (max-width:480px){
		table.full-width-mobile{
			width:100% !important;
		}

}	@media only screen and (max-width:480px){
		td.full-width-mobile{
			width:auto !important;
		}

}		#outlook a{
			padding:0;
		}
		.ReadMsgBody{
			width:100%;
		}
		.ExternalClass{
			width:100%;
		}
		.ExternalClass *{
			line-height:100%;
		}
		body{
			margin:0;
			padding:0;
			-webkit-text-size-adjust:100%;
			-ms-text-size-adjust:100%;
		}
		table,td{
			border-collapse:collapse;

		}
		img{
			border:0;
			height:auto;
			line-height:100%;
			outline:none;
			text-decoration:none;
		}
		p{
			display:block;
			margin:13px 0;
		}
	@media only screen and (max-width:480px){
		width:320px{
			width:320px;
		}

}	@media only screen and (min-width:480px){
		.mj-column-per-100{
			width:100% !important;
			max-width:100%;
		}

}	@media only screen and (max-width:480px){
		table.full-width-mobile{
			width:100% !important;
		}

}	@media only screen and (max-width:480px){
		td.full-width-mobile{
			width:auto !important;
		}

}		
</style></head>
  <body style="background-color: #F6F6FC;margin: 0;padding: 0;-webkit-text-size-adjust: 100%;-ms-text-size-adjust: 100%;">
    <div style="background-color:#F6F6FC;">
      <!--[if mso | IE]>
      <table align="center" border="0" cellpadding="0" cellspacing="0" style="width:600px;" width="600">
        <tr>
          <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;">
            <![endif]-->
      <div style="margin:0px auto;max-width:600px;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width: 100%;border-collapse: collapse;">
          <tbody>
            <tr>
              <td style="direction: ltr;font-size: 0px;padding: 20px 0;text-align: center;vertical-align: top;border-collapse: collapse;">
                <!--[if mso | IE]>
                <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                  
                  <tr>
                    
                    <td style="vertical-align:top;width:600px;">
                      <![endif]-->
                <div class="mj-column-per-100 outlook-group-fix" style="font-size:13px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
                  <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align: top;border-collapse: collapse;" width="100%">
                    <tr>
                      <td align="center" style="font-size: 0px;padding: 10px 25px;border-collapse: collapse;">
                        <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;border-spacing:0px;">
                          <tbody>
                            <tr>
                              <td style="width: 72px;border-collapse: collapse;"> 
                                <img src="https://cbdbene.com/static/media/bene_new.ce8b3135.png" style="border: 0;display: block;outline: none;text-decoration: none;height: auto;width: 100%;line-height: 100%;" width="72" alt="logo.png">
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  </table>
                </div>
                <!--[if mso | IE]>
              </td>
              
            </tr>
            
          </table>
          <![endif]-->
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <!--[if mso | IE]>
    </td>
  </tr>
</table>
<table align="center" border="0" cellpadding="0" cellspacing="0" style="width:600px;" width="600">
  <tr>
    <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;">
      <![endif]-->
      <div style="background:#ffffff;background-color:#ffffff;margin:0px auto;border-radius:8px;max-width:600px;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background: #ffffff;background-color: #ffffff;width: 100%;border-radius: 8px;border-collapse: collapse;">
          <tbody>
            <tr>
              <td style="direction: ltr;font-size: 0px;padding: 0px;text-align: center;vertical-align: top;border-collapse: collapse;">
                <!--[if mso | IE]>
                <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                  
                  <tr>
                    <td width="600">
                      
                      <table align="center" border="0" cellpadding="0" cellspacing="0" style="width:600px;" width="600">
                        <tr>
                          <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;">
                            <![endif]-->
                <div style="margin:0px auto;max-width:600px;">
                  <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width: 100%;border-collapse: collapse;">
                    <tbody>
                      <tr>
                        <td style="direction: ltr;font-size: 0px;padding: 0;text-align: center;vertical-align: top;border-collapse: collapse;">
                          <!--[if mso | IE]>
                          <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                            
                            <tr>
                              
                              <td style="vertical-align:top;width:600px;">
                                <![endif]-->
                          <div class="mj-column-per-100 outlook-group-fix" style="font-size:13px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
                            <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%" style="border-collapse: collapse;">
                              <tbody>
                                <tr>
                                  <td style="vertical-align: top;padding: 0;border-collapse: collapse;">
                                    <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%" style="border-collapse: collapse;">
                                      <tr>
                                        <td align="center" style="font-size: 0px;padding: 0;border-collapse: collapse;">
                                          <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;border-spacing:0px;">
                                            <tbody>
                                              <tr>
                                                <td style="width: 600px;border-collapse: collapse;"> <img src="https://gallery.mailchimp.com/108b19dfcf418dbca9e8ab4e6/images/bd7542ed-1b66-4ebb-949d-a2e00caa7dcc.jpg" style="border: 0;border-radius: 8px 8px 0 0;display: block;outline: none;text-decoration: none;height: auto;width: 100%;line-height: 100%;" width="600" alt="invite_header.jpg">
                                                </td>
                                              </tr>
                                            </tbody>
                                          </table>
                                        </td>
                                      </tr>
                                    </table>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                          <!--[if mso | IE]>
                        </td>
                        
                      </tr>
                      
                    </table>
                    <![endif]-->
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <!--[if mso | IE]>
              </td>
            </tr>
          </table>
          
        </td>
      </tr>
      
      <tr>
        <td width="600">
          
          <table align="center" border="0" cellpadding="0" cellspacing="0" style="width:600px;" width="600">
            <tr>
              <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;">
                <![endif]-->
                <div style="margin:0px auto;max-width:600px;">
                  <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width: 100%;border-collapse: collapse;">
                    <tbody>
                      <tr>
                        <td style="direction: ltr;font-size: 0px;padding: 30px 30px 20px 30px;text-align: center;vertical-align: top;border-collapse: collapse;">
                          <!--[if mso | IE]>
                          <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                            
                            <tr>
                              
                              <td style="vertical-align:top;width:540px;">
                                <![endif]-->
                          <div class="mj-column-per-100 outlook-group-fix" style="font-size:13px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
                            <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align: top;border-collapse: collapse;" width="100%">
                              <tr>
                                <td align="center" style="font-size: 0px;padding: 10px 25px;border-collapse: collapse;">
                                  <div style="font-family:Lato, Helvetica, sans;font-size:18px;font-weight:bold;line-height:26px;text-align:center;color:#2B2A35;"> Confirm your email address </div>
                                </td>
                              </tr>
                              <tr>
                                <td align="center" style="font-size: 0px;padding: 0px;border-collapse: collapse;">
                                  <div style="font-family:Lato, Helvetica, sans;font-size:15px;line-height:24px;text-align:center;color:#545465;">
                                    <p style="display: block;margin: 13px 0;">Hi there! We're all set to take you to DocMz and set you up there. Hop on!</p><p style="display: block;margin: 13px 0;"> You've recieved this message because your email address has been registered with DocMz. We can't do this without your explicit permission, so you need to confirm your email address.</p><br>
                                    <div class="mj-column-per-100 outlook-group-fix" style="font-size:13px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
                            <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align: top;border-collapse: collapse;" width="100%">
                              <tr>
                                <td align="center" style="font-size: 0px;padding: 0;border-collapse: collapse;">
                                  <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;line-height:100%;">
                                    <tr>
                                      <td align="center" bgcolor="#586EE0" style="border: none;border-radius: 6px;padding: 10px 25px;background: #586EE0;border-collapse: collapse;" valign="middle"> <a href="#" style="background:#586EE0;color:#ffffff;font-family:Lato, Helvetica, sans;font-size:15px;font-weight:bold;line-height:120%;margin:0;text-decoration:none;text-transform:none;" target="_blank">Yes, count me in</a></td></tr></table>
                                  </td>
                                </tr>
                              </table>
                            </div>
                                    
                                  </div>
                                </td>
                              </tr>
                            </table>
                          </div>
                          <!--[if mso | IE]>
                        </td>
                        
                      </tr>
                      
                    </table>
                    <![endif]-->
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <!--[if mso | IE]>
              </td>
            </tr>
          </table>
          
        </td>
      </tr>
      
      <tr>
        <td width="600">
          
          <table align="center" border="0" cellpadding="0" cellspacing="0" style="width:600px;" width="600">
            <tr>
              <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;">
                <![endif]-->
                <div style="margin:0px auto;max-width:600px;">
                  <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width: 100%;border-collapse: collapse;">
                    <tbody>
                      <tr>
                        <td style="direction: ltr;font-size: 0px;padding: 0 0 35px 0;text-align: center;vertical-align: top;border-collapse: collapse;">
                          <!--[if mso | IE]>
                          <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                            
                            <tr>
                              
                              <td style="vertical-align:top;width:600px;">
                                <![endif]-->
                          

                            <!--[if mso | IE]>
                          </td>
                          
                        </tr>
                        
                      </table>
                      <![endif]-->
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <!--[if mso | IE]>
                </td>
              </tr>
            </table>
            
          </td>
        </tr>
        
      </table>
      <![endif]-->
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <!--[if mso | IE]>
      </td>
    </tr>
  </table>
  
  <table align="center" border="0" cellpadding="0" cellspacing="0" style="width:600px;" width="600">
    <tr>
      <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;">
        <![endif]-->
        <div style="margin:0px auto;max-width:600px;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width: 100%;border-collapse: collapse;">
            <tbody>
              <tr>
                <td style="direction: ltr;font-size: 0px;padding: 20px 0 30px 0;text-align: center;vertical-align: top;border-collapse: collapse;">
                  <!--[if mso | IE]>
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                    
                    <tr>
                      
                      <td style="vertical-align:top;width:600px;">
                        <![endif]-->
                  <div class="mj-column-per-100 outlook-group-fix" style="font-size:13px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
                    <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align: top;border-collapse: collapse;" width="100%">
                      <tr>
                        <td align="center" style="font-size: 0px;padding: 10px 25px;border-collapse: collapse;">
                          <div style="font-family:Lato, Helvetica, sans;font-size:12px;line-height:18px;text-align:center;color:#939DA8;">
                            <p style="display: block;margin: 13px 0;">Copyright © 2019 DocMz<br>
                            blablabla, 10119 bla, bla bla<br>
                            bla bla bla bla blabla<br>
                            blabla bla blabla</p>
                            <p style="display: block;margin: 13px 0;">If it wasn't you who submitted your email address in the first place, well then that's messed up and we're sorry. Simply ignore this email and don't click above.<br>
                            
                          </p>
                        </div>
                      </td>
                    </tr>
                  </table>
                </div>
                <!--[if mso | IE]>
              </td>
              
            </tr>
            
          </table>
          <![endif]-->
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <!--[if mso | IE]>
    </td>
  </tr>
</table>
<![endif]-->
    </div>

  
  </body>
</html>" */
      }
      // };

      // smtpTransport.sendMail(mailOptions, function(err) {
      //   if (err) console.log(err);
      // });
    });
  }, 3000);
};

// Function to authenticate an user
let authenticateDoctor = (req, res) => {
  if (req.body.email) {
    {
      let { email, password } = req.body;
      let cipher = crypto.createCipheriv(algorithm, new Buffer.from(key), iv);
      let encrypted =
        cipher.update(password, "utf8", "hex") + cipher.final("hex");
      Practise.findOne({ email }).then(doctor => {
        app.get(sessionChecker, (req, res) => {
          console.log({ status: "session stored" });
        });

        //Checking if User exits or not
        if (doctor) {
          console.log(encrypted);
          console.log(doctor);
          if (!doctor) {
            res.status(404).json({ status: false, message: "User Not Found!" });
          } else if (encrypted != doctor.password) {
            res.json({ status: false, error: "Password Entered is Incorrect" });
          } else {
            if (doctor) {
              console.log(Jwt.secret);
              let token = jwt.sign(doctor.toJSON(), "catchmeifyoucan", {
                expiresIn: 604800
              });

              req.session.user = doctor;
              req.session.Auth = doctor;
              res.status(200).json({
                status: true,
                user: req.session.Auth,
                token: "JWT-" + token
              });
            }
          }
        }
      });
    }
  }
};

// // middleware function to check for logged in users
let sessionChecker = (req, res, next) => {
  if (req.session.user && req.cookies.user_sid) {
    res.redirect("/");
  } else {
    next();
  }
};

//Update profile details
let profileUpdate = (req, res) => {
  let { id } = req.body;
  if (req.body.id) {
    Practise.findByIdAndUpdate(id, req.body, { new: true })
      .then(doctor => {
        res.json({
          status: true,
          message: "Profile successfully updated",
          data: doctor
        });
      })
      .catch(error => {
        res.json({ status: false, message: error });
      });
  }
};

//Create and save time slots
let saveSlots = (req, res) => {
  let test = Scheduler.getTimeSlots(req.body);
  res.json({ status: true, message: "Success", data: test });
};

//Exporting all the functions
module.exports = {
  getNpiInfo,
  addDoctors,
  getAllDoctors,
  signUpDoc,
  authenticateDoctor,
  profileUpdate,
  saveSlots
};