import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// Initialize Supabase client with the CORRECT URL
const supabase = createClient(
  "https://bhzwyokvygnxnqdocjhy.supabase.co", // Use the working URL from your other file
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoend5b2t2eWdueG5xZG9jamh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxNTQ1MDYsImV4cCI6MjA3MzczMDUwNn0.vSyiiRvQNV9DOcZRUHH31YkNqC5KZHgo0IqZ0DBcpUE"
);

// Function to automatically determine current quarter
function getCurrentQuarter() {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const year = now.getFullYear();

  if (month >= 1 && month <= 3) return `winter${year}`;
  if (month >= 4 && month <= 6) return `spring${year}`;
  if (month >= 7 && month < 9) return `summer${year}`;
  return `fall${year}`;
}

async function handleSubmit(event) {
  console.log("=== FORM SUBMIT TRIGGERED ===");
  event.preventDefault();
  console.log("Default prevented, processing form...");

  const formData = new FormData(event.target);
  const file = formData.get("pdfUpload");

  console.log("File retrieved:", file);

  let fileUrl = null;
  if (file && file.name) {
    try {
      fileUrl = await handleFileUpload(file);
      console.log("File URL returned:", fileUrl);
    } catch (error) {
      console.error("File upload failed:", error);
      alert("File upload failed: " + error.message);
      return;
    }
  }

  // Prepare form values
  const formDataObj = Object.fromEntries(formData.entries());
  delete formDataObj.pdfUpload; // Remove the file object

  const currentQuarter = getCurrentQuarter();
  console.log(`Submitting form for quarter: ${currentQuarter}`);
  console.log("Form data object:", formDataObj);
  console.log(
    "cannot_staff value:",
    formDataObj.cannot_staff,
    "(type:",
    typeof formDataObj.cannot_staff,
    ")"
  );

  const formValues = {
    ...formDataObj,
    quarter: currentQuarter,
    pdfUpload: fileUrl,
  };

  console.log("Final form values being sent to Supabase:", formValues);

  try {
    // Check if an entry already exists for this person in this quarter
    const { data: existingData, error: queryError } = await supabase
      .from("staff_responses")
      .select("*")
      .eq("fname", formDataObj.fname)
      .eq("lname", formDataObj.lname)
      .eq("quarter", currentQuarter)
      .single();

    if (queryError && queryError.code !== "PGRST116") {
      // PGRST116 means no rows found
      throw queryError;
    }

    if (existingData) {
      // Entry exists - update it
      console.log("Existing entry found, updating:", existingData);

      // If there's a new file and old file exists, delete the old file
      if (fileUrl && existingData.pdfUpload) {
        try {
          const oldFilePath = extractFilePathFromUrl(existingData.pdfUpload);
          if (oldFilePath) {
            await supabase.storage
              .from("staffer-agreements")
              .remove([oldFilePath]);
            console.log("Old file deleted:", oldFilePath);
          }
        } catch (deleteError) {
          console.error("Error deleting old file:", deleteError);
          // Continue even if delete fails
        }
      }

      // Update the existing entry
      const { data, error } = await supabase
        .from("staff_responses")
        .update(formValues)
        .eq("fname", formDataObj.fname)
        .eq("lname", formDataObj.lname)
        .eq("quarter", currentQuarter);

      if (error) {
        throw error;
      }

      console.log("Form updated successfully:", data);
    } else {
      // No existing entry - insert new
      console.log("No existing entry found, inserting new record");
      const { data, error } = await supabase
        .from("staff_responses")
        .insert([formValues]);

      if (error) {
        throw error;
      }

      console.log("Form submitted successfully:", data);
    }

    // Show success message and enable edit functionality
    const successMessage = document.getElementById("successMessage");
    const submitBtn = document.getElementById("submitBtn");
    const editBtn = document.getElementById("editBtn");
    const cannotStaffBtn = document.getElementById("cannotStaffBtn");
    const cannotStaffNotice = document.getElementById("cannotStaffNotice");
    const form = document.getElementById("myForm");

    successMessage.style.display = "block";
    form.classList.add("disabled");
    submitBtn.style.display = "none";

    // Hide the yellow submitting notice
    cannotStaffNotice.style.display = "none";

    // Hide and reset cannot staff button
    cannotStaffBtn.style.display = "none";
    cannotStaffBtn.disabled = false;
    cannotStaffBtn.textContent = "Cannot Staff This Quarter";
    cannotStaffBtn.classList.add("cannot-staff-btn");

    editBtn.style.display = "inline-block";

    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (error) {
    console.error("Error occurred while submitting form:", error);
    alert("Form submission failed: " + error.message);
  }
}

// Helper function to extract file path from public URL
function extractFilePathFromUrl(url) {
  try {
    // URL format: https://.../storage/v1/object/public/staffer-agreements/winter2026/filename.pdf
    const match = url.match(/staffer-agreements\/(.+)$/);
    return match ? match[1] : null;
  } catch (error) {
    console.error("Error extracting file path:", error);
    return null;
  }
}

async function handleFileUpload(file) {
  // Generate a unique filename and sanitize it
  const timestamp = new Date().getTime();
  const sanitizedFileName = file.name
    .replace(/[^\w\s.-]/g, "") // Remove special characters except word chars, spaces, dots, hyphens
    .replace(/\s+/g, "_") // Replace spaces with underscores
    .replace(/_{2,}/g, "_"); // Replace multiple underscores with single underscore

  const fileName = `${timestamp}-${sanitizedFileName}`;
  const currentQuarter = getCurrentQuarter();

  // Use single bucket with quarter folders
  const filePath = `${currentQuarter}/${fileName}`;
  const bucketName = "staffer-agreements";

  console.log("File selected:", file.name);
  console.log("Uploading file to path:", filePath);
  console.log("Using bucket:", bucketName);

  try {
    // Upload the file
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (error) {
      console.error("Error uploading file:", error);
      throw error;
    }

    console.log("File upload successful, data returned:", data);

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    if (!urlData || !urlData.publicUrl) {
      throw new Error("Failed to get public URL for uploaded file");
    }

    console.log("Public file URL:", urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error) {
    console.error("File upload process failed:", error);
    throw error;
  }
}

// Add logging to verify script is loaded
console.log("upload.js loaded successfully");

// Wrap in DOMContentLoaded to ensure form exists
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM loaded, attaching form listener");
  const form = document.getElementById("myForm");

  if (!form) {
    console.error("ERROR: Could not find form with id 'myForm'");
    return;
  }

  console.log("Form found, attaching submit listener");
  form.addEventListener("submit", handleSubmit);
  console.log("Submit listener attached successfully");
});
