const url = require('url')
const crypto = require('crypto')
const https = require('https')

// ---------------------------------------------- 
// creates an ad-hoc Blob Service SAS on the Blob Container or Blob resource (if file is provided)
// https://docs.microsoft.com/en-us/rest/api/storageservices/Constructing-a-Service-SAS
exports.createServiceSAS = function (key, storageacc, container, minutes, file) {

    // first construct the string-to-sign from the fields comprising the request,
    // then encode the string as UTF-8 and compute the signature using the HMAC-SHA256 algorithm
    // Note that fields included in the string-to-sign must be URL-decoded

    let exp_date = new Date(Date.now() + (minutes*60*1000)),
        //  The permissions associated with the shared access signature 
        // (Blob: r=read, a=add, c=create, w=write,  d=delete)
        // (Container: r=read, a=add, c=create, w=write,  d=delete, l=list)
        signedpermissions = file? "racw" : "rl",
        signedstart = '',
        signedexpiry= exp_date.toISOString().substring(0, 19) + 'Z',
        // for Blob or Container level Signed Resoure
        canonicalizedresource= file?  `/blob/${storageacc}/${container}/${file}` : `/blob/${storageacc}/${container}`,
        signedidentifier = '', //if you are associating the request with a stored access policy.
        signedIP = '',
        signedProtocol = 'https',
        signedversion = '2018-03-28',
        rscc = '', // Blob Service and File Service Only, To define values for certain response headers, Cache-Control
        rscd = '', // Content-Disposition
        rsce = '', // Content-Encoding
        rscl = '', // Content-Language
        rsct = '', // Content-Type
        stringToSign = 
          signedpermissions + "\n" +
          signedstart + "\n" +
          signedexpiry + "\n" +
          canonicalizedresource + "\n" +
          signedidentifier + "\n" +
          signedIP + "\n" +
          signedProtocol + "\n" +
          signedversion + "\n" +
          rscc + "\n" +
          rscd + "\n" +
          rsce + "\n" +
          rscl + "\n" +
          rsct

    // create the string, then encode the string as UTF-8 and compute the signature using the HMAC-SHA256 algorithm
    const sig = crypto.createHmac('sha256', Buffer.from(key, 'base64')).update(stringToSign, 'utf-8').digest('base64');
    //console.log (`createServiceSAS stringToSign : ${stringToSign}`)
    return { 
        exp_date: exp_date.getTime(),
        container_url: `https://${storageacc}.blob.core.windows.net/${container}`, 
        sas: 
            //`st=2016-08-15T11:03:04Z&" +
            // signed expire 2017-08-15T19:03:04Z
            `se=${encodeURIComponent(signedexpiry)}&` + 
            //  The permissions associated with the shared access signature
            `sp=${signedpermissions}&` + 
            // API Version
            `sv=${signedversion}&` +  
            // The signedresource (sr) field specifies which resources are accessible via the shared access signature
            // signed resource 'c' = the shared resource is a Container (and to the list of blobs in the container) 'b' = the shared resource is a Blob
            `sr=${file ? "b" : "c"}&` +   

            //    "sip=0.0.0.0-255.255.255.255&" +
            // The Protocal (https)
            `spr=${signedProtocol}&` +
            `sig=${encodeURIComponent(sig)}`
    }



}



  /* ------------------------------------- FILE HANDLING
    UNIX COMMAND
    mongofiles -d myapp_dev list
    mongofiles -d myapp_dev get profile-pic511a7c150c62fde30f000003
  */
 exports.getfile = function (filename, res) {
    console.log ('getfile() filename : ' + filename);
    res.status(400).send({error: "Need to impelement with Blob"});
/*
    try {
      var gfs = Grid(db, mongo),
          findopts = {_id: new ObjectID(filename)};

      gfs.exist(findopts, function (err, found) {
        if (err) return res.status(400).send(err);
        if (!found) res.status(400).send({error: "no file found" + filename});

        console.log('File exists'  + filename);

        var readstream = gfs.createReadStream(findopts);

        readstream.on('finish', function (file) {
            console.log ('getfile pipe finished ');
        });

        readstream.on('error', function (e) {
            console.log ('getfile pipe error : ' + JSON.stringify(e));
            res.status(400).send({error: JSON.stringify(e)});
        });

        console.log ('getfile pipe  ' + filename);
        readstream.pipe(res);

      });
    } catch (e) {
      console.log ('getfile try error : ' + JSON.stringify(e));
      res.status(400).send({error: JSON.stringify(e)});
    }
*/
};

exports.putfile = function (req, res, origname) {
  res.status(400).send({error: "Need to implement with Blob"});
  /*
  var filename = new ObjectID (),
      gfs = Grid(db, mongo),
      writestream = gfs.createWriteStream({
          _id: filename,
          filename: origname,
          metadata: {
            ownerId: 'authTBC',
            uploadIP: '??'
          }
      });

  writestream.on('finish', function (file) {
    console.log ('putfile pipe finished ' + JSON.stringify(file));
    res.send({_id: filename});
  });

  writestream.on('error',function(e) {
    console.log ('putfile pipe error ');
    res.status(400).send({error: JSON.stringify(e)});
  });

  console.log ('putfile pipe  ' + filename);
  req.pipe(writestream);
  */
};

exports.listfiles = function( success, error) {
  error("Need to implement with Blob")
  /*
  var gfs = Grid(db, mongo);
  gfs.files.find({}).toArray(function (err, files) {
    if (err) error(err);
    success(files);
  })
  */
}