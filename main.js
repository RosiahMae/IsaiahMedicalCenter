document.addEventListener('DOMContentLoaded', function() {

    // --- 1. Notification System (for AJAX feedback) ---
    // Displays a temporary, non-blocking notification to the user.
    function showNotification(message, type = 'success') {
        let notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        // Prepend to the body to ensure it's visible
        document.body.prepend(notification);

        // Auto-remove after 4 seconds
        setTimeout(() => {
            notification.classList.add('hide');
            notification.addEventListener('transitionend', () => notification.remove());
        }, 4000);
    }

    // --- 2. Universal Modal Handler ---
    const openModalButtons = document.querySelectorAll('[data-modal-target]');
    const closeModalButtons = document.querySelectorAll('.modal .close-button');

    openModalButtons.forEach(button => {
        button.addEventListener('click', () => {
            const modalId = button.getAttribute('data-modal-target');
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.style.display = 'block';
            }
        });
    });

    closeModalButtons.forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
                // Reset form inside the modal upon closing
                const form = modal.querySelector('form');
                if (form) form.reset();
            }
        });
    });

    // Allow closing the modal by clicking outside of the modal content
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });

    // --- 3. Patient Search / Selection (Used in appointments.php and consultations.php) ---
    const patientSearchInput = document.getElementById('patient_search_input');
    const searchResults = document.getElementById('patient_search_results');

    if (patientSearchInput && searchResults) {
        const patientIdInput = document.getElementById('patient_id_input');
        const patientNameDisplay = document.getElementById('patient_name_display');

        patientSearchInput.addEventListener('keyup', function() {
            const searchTerm = this.value.trim();
            if (searchTerm.length < 2) {
                searchResults.innerHTML = '';
                return;
            }

            // Using fetch for patient search (GET request)
            fetch(`/clinic-system/api/handler.php?action=search_patients&term=${encodeURIComponent(searchTerm)}`)
                .then(response => response.json())
                .then(data => {
                    let html = '';
                    if (data && data.length > 0) {
                        data.forEach(p => {
                            // Ensure data-name uses correct column name
                            html += `<div class="search-result-item" data-id="${p.patient_id}" data-name="${p.full_name}">${p.full_name} (${p.id_number})</div>`;
                        });
                    } else {
                        html = '<div class="search-no-results">No patients found.</div>';
                    }
                    searchResults.innerHTML = html;
                })
                .catch(error => console.error('Error searching patients:', error));
        });

        searchResults.addEventListener('click', function(e) {
            if (e.target.classList.contains('search-result-item')) {
                // Safely check if all required elements exist before assignment
                if (patientIdInput && patientNameDisplay) {
                    patientIdInput.value = e.target.dataset.id;
                    patientNameDisplay.textContent = `Selected: ${e.target.dataset.name}`;
                    patientSearchInput.value = '';
                    searchResults.innerHTML = '';
                } else {
                    console.error('Missing required elements for patient selection (patient_id_input or patient_name_display)');
                }
            }
        });
    }

    // --- 4. AJAX Form Submission Handlers ---

    // Generic function to handle form submission
    function handleFormSubmission(formId, successMessage, failureMessage) {
        const form = document.getElementById(formId);
        if (!form) return;

        form.addEventListener('submit', function(e) {
            e.preventDefault();

            // Special validation for patient selection in consultation/appointment forms
            if (formId === 'consultationForm' || formId === 'appointmentForm') {
                const patientIdInput = document.getElementById('patient_id_input');
                if (!patientIdInput || !patientIdInput.value) {
                    showNotification("Please select a patient first.", 'error');
                    return;
                }
            }
            
            const formData = new FormData(form);

            fetch('/clinic-system/api/handler.php', {
                method: 'POST',
                body: formData
            })
            .then(response => {
                if (!response.ok) {
                    // This handles server errors (e.g., 500 status)
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.status === 'success') {
                    showNotification(successMessage);
                    form.reset();
                    // Close the modal
                    const modal = form.closest('.modal');
                    if (modal) modal.style.display = 'none';
                    // Reload the page to display the new data in the table
                    setTimeout(() => window.location.reload(), 500);
                } else {
                    // This handles application errors returned in the JSON (e.g., duplicate ID)
                    showNotification(failureMessage + ': ' + (data.message || 'Unknown error.'), 'error');
                }
            })
            .catch(error => {
                console.error('Submission Error:', error);
                showNotification(`An unexpected error occurred: ${error.message}`, 'error');
            });
        });
    }

    // Initialize handlers for the main forms
    handleFormSubmission('patientForm', 'Patient record added successfully!', 'Failed to add patient');
    handleFormSubmission('consultationForm', 'Consultation logged successfully!', 'Failed to log consultation');
    handleFormSubmission('medicineForm', 'Medicine added to inventory successfully!', 'Failed to add medicine');
    handleFormSubmission('appointmentForm', 'Appointment scheduled successfully!', 'Failed to schedule appointment');


    // --- 5. Add Custom CSS for Notification (Injection into Head) ---
    // This is added here to ensure the notification style is available.
    const style = document.createElement('style');
    style.textContent = `
        /* Notification Styles */
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            border-radius: 8px;
            color: #fff;
            font-weight: 600;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            opacity: 1;
            transition: opacity 0.5s ease-out, transform 0.5s ease-out;
            transform: translateY(0);
        }
        .notification.hide {
            opacity: 0;
            transform: translateY(-50px);
        }
        .notification-success {
            background-color: #10b981; /* Emerald Green */
        }
        .notification-error {
            background-color: #ef4444; /* Red */
        }
        .notification-info {
            background-color: #3b82f6; /* Blue */
        }
    `;
    document.head.appendChild(style);

});
