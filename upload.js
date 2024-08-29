import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// Initialize Supabase client
const supabase = createClient(
  "https://qlpnemwvmcskvybbgtad.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFscG5lbXd2bWNza3Z5YmJndGFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ3Mjc0NTIsImV4cCI6MjA0MDMwMzQ1Mn0.zcvOnnZF0lqsSCb_286byzVOqL9EyR75OZMDWoPWrAQ"
);

// Handle form submission
async function handleSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const file = formData.get("pdfUpload");

  let fileUrl = "";
  if (file) {
    try {
      fileUrl = await handleFileUpload(file);
    } catch (error) {
      console.error("File upload failed:", error);
    }
  }

  // Prepare other form values
  const formValues = {
    ...Object.fromEntries(formData.entries()),
    pdfUpload: fileUrl,
  };

  try {
    const { error } = await supabase.from("preferences").insert([formValues]);

    if (error) {
      throw error;
    }

    // Redirect to the thank-you page
    window.location.href =
      "https://web.stanford.edu/group/bridge/staffonly/thank-you.html";
  } catch (error) {
    console.error("Error occurred while submitting form:", error);
  }
}

// Handle file upload
async function handleFileUpload(file) {
  // Define the path and file name for the uploaded file
  const filePath = `uploads/tests/${file.name}`;

  // Upload the file to Supabase Storage
  const { data, error } = await supabase.storage
    .from("uploads")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("Error uploading file:", error);
    throw error;
  }

  // Return the public URL of the uploaded file
  const { publicURL, error: urlError } = supabase.storage
    .from("uploads")
    .getPublicUrl(filePath);

  if (urlError) {
    console.error("Error getting file URL:", urlError);
    throw urlError;
  }

  return publicURL;
}

// Add event listener to form
document.getElementById("myForm").addEventListener("submit", handleSubmit);
