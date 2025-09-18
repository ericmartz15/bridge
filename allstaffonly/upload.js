// import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// // Initialize Supabase client
// const supabase = createClient( // UPDATE FOR EACH NEW PROJECT
//   "https://uwbudrkqyjxcnlpkezdt.supabase.co",
//   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3YnVkcmtxeWp4Y25scGtlemR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1NjI2MjksImV4cCI6MjA1OTEzODYyOX0.8-3ubutM6TH54iw2UBLRGSbCECZG4dzjoRgarBzLLBw");

// async function handleSubmit(event) {
//   event.preventDefault();
//   const formData = new FormData(event.target);
//   const file = formData.get("pdfUpload");

//   // Add this log to see if the file is correctly retrieved
//   console.log("File retrieved:", file);

//   let fileUrl = "";
//   if (file) {
//     try {
//       fileUrl = await handleFileUpload(file); // Call the updated handleFileUpload function
//     } catch (error) {
//       console.error("File upload failed:", error);
//     }
//   }

//   // Prepare other form values
//   const formValues = {
//     ...Object.fromEntries(formData.entries()),
//     pdfUpload: fileUrl, // Add the uploaded file URL to form values
//   };

//   try {
//     const { error } = await supabase
//       .from("spr25_responses") // Ensure this matches your table name
//       .insert([formValues]);

//     if (error) {
//       throw error;
//     }

//     // Redirect to the thank-you page
//     window.location.href =
//       "https://web.stanford.edu/group/bridge/staffonly/thank-you.html";
//   } catch (error) {
//     console.error("Error occurred while submitting form:", error);
//   }
// }

// async function handleFileUpload(file) {
//   // const filePath = `staffer_agreements/${file.name}`; // Use the file name directly, no folder
//   const filePath = `staffer_agreements/${encodeURIComponent(file.name)}`;
//   console.log("File selected:", file.name);
//   console.log("Uploading file to path:", filePath);

//   const { data, error } = await supabase.storage
//     .from("spr25-agreements") // Updated to match your bucket name
//     .upload(filePath, file, {
//       cacheControl: "3600",
//       upsert: false, // Set to true if you want to allow overwriting
//     });

//   if (error) {
//     console.error("Error uploading file:", error); // Log any errors during upload
//     throw error;
//   }

//   console.log("File upload successful, data returned:", data); // Log upload success

//   const { publicURL, error: urlError } = supabase.storage
//     .from("spr25-agreements") // Updated to match your bucket name
//     .getPublicUrl(filePath);

//   if (urlError) {
//     console.error("Error getting file URL:", urlError); // Log any errors with URL generation
//     throw urlError;
//   }

//   console.log("Public file URL:", publicURL);
//   return publicURL; // Return the public URL of the uploaded file
// }

// document.getElementById("myForm").addEventListener("submit", handleSubmit);
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// Initialize Supabase client
const supabase = createClient(
  "https://uwbudrkqyjxcnlpkezdt.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3YnVkcmtxeWp4Y25scGtlemR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1NjI2MjksImV4cCI6MjA1OTEzODYyOX0.8-3ubutM6TH54iw2UBLRGSbCECZG4dzjoRgarBzLLBw"
);

async function handleSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const file = formData.get("pdfUpload");

  // Add this log to see if the file is correctly retrieved
  console.log("File retrieved:", file);

  let fileUrl = null; // Initialize as null
  if (file && file.name) {
    // Check if file exists and has a name property
    try {
      fileUrl = await handleFileUpload(file);
      console.log("File URL returned:", fileUrl);
    } catch (error) {
      console.error("File upload failed:", error);
      alert("File upload failed: " + error.message);
      return; // Prevent form submission if file upload fails
    }
  }

  // Prepare form values, removing the file from the data to be inserted
  const formDataObj = Object.fromEntries(formData.entries());
  delete formDataObj.pdfUpload; // Remove the file object

  const formValues = {
    ...formDataObj,
    pdfUpload: fileUrl, // Store URL in a separate column
  };

  try {
    const { data, error } = await supabase
      .from("spr25_responses")
      .insert([formValues]);

    if (error) {
      throw error;
    }

    console.log("Form submitted successfully:", data);
    // Redirect to the thank-you page
    window.location.href =
      "https://web.stanford.edu/group/bridge/staffonly/thank-you.html";
  } catch (error) {
    console.error("Error occurred while submitting form:", error);
    alert("Form submission failed: " + error.message);
  }
}

async function handleFileUpload(file) {
  // Generate a unique filename to prevent overwriting
  const timestamp = new Date().getTime();
  const fileExt = file.name.split(".").pop();
  const fileName = `${timestamp}-${file.name}`;
  const filePath = `staffer_agreements/${fileName}`;

  console.log("File selected:", file.name);
  console.log("Uploading file to path:", filePath);

  const { data: buckets, error: bucketsError } =
    await supabase.storage.listBuckets();
  if (bucketsError) {
    console.error("Error fetching buckets:", bucketsError);
  } else {
    console.log(
      "Buckets available:",
      buckets.map((b) => b.name)
    );
  }

  // First, check if the bucket exists
  // const { data: buckets, error: bucketsError } =
  //   await supabase.storage.listBuckets();

  // if (bucketsError) {
  //   console.error("Error checking buckets:", bucketsError);
  //   throw bucketsError;
  // }

  // const bucketExists = buckets.some(
  //   (bucket) => bucket.name === "spr25-agreements"
  // );
  // if (!bucketExists) {
  //   console.error("Bucket 'spr25-agreements' does not exist");
  //   throw new Error("Storage bucket not found. Please check the bucket name.");
  // }

  // Upload the file
  const { data, error } = await supabase.storage
    .from("spr25-agreements")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true, // Set to true to allow overwriting if needed
    });

  if (error) {
    console.error("Error uploading file:", error);
    throw error;
  }

  console.log("File upload successful, data returned:", data);

  // Get the public URL
  const { data: urlData } = supabase.storage
    .from("spr25-agreements")
    .getPublicUrl(filePath);

  if (!urlData || !urlData.publicUrl) {
    throw new Error("Failed to get public URL for uploaded file");
  }

  console.log("Public file URL:", urlData.publicUrl);
  return urlData.publicUrl;
}

document.getElementById("myForm").addEventListener("submit", handleSubmit);
