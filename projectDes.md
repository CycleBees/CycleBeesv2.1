HAND WRITEEN:

App Name: Cycle-Bees

NOTE: App needs to be modern, minimal, and functional, no extra features or anything need not to be added, Extra feature addition is strictly prohibited

Color Code For the app: FFD11E 2D3E50 FBE9A0 FFF5CC 2F2500 2B2E00 4A4A4A

Roles : User (the one using the App), Admin (the one managing everything)

Preferred tech: App for User (React Native with Expo App), Separate web-dashboard for Admin (React), and other tech stacks are mentioned here,

**Offline‐First MVP Prototype (TL;DR)**

1. **Local DB & Auth**
    - Run Postgres (or SQLite) locally with your future Supabase schema.
    - Use JWTs in Express (e.g. `jsonwebtoken`) and `bcrypt` for admin passwords.
2. **Express Backend with Mocks**
    - **OTP:** Generate/console‐log 6-digit codes in-memory instead of Twilio.
    - **Payments:** Fake a `/payments/mock` endpoint that triggers your webhook logic.
    - **Expiry Jobs:** Use `setTimeout` or `node-cron` for 15-min booking expirations.
3. **Local File Storage**
    - Accept uploads via `multer` into an `uploads/` folder and serve them with an authenticated static route.
4. **Front-Ends Pointing Locally**
    - **Expo React Native:** Set API base to `http://localhost:3000`.
    - **React Dashboard:** Hit the same local endpoints for CRUD and status flows.
5. **Swap to Cloud**
    - Replace mocks with **Supabase Auth/DB/Storage**, **Twilio Verify** and **Razorpay**, and deploy your Express app to Vercel/Heroku.

NOTE: For the first build i want you to setup the “online payment option” and keep place for later razer-pay integration, but for now, will only focus on

Step 1

since this version is fully offline based, so that all the things can be checkd and the whole thing can be built first, and then easily checked and then can connect to the cloud services for actual production, for now will do everything offline (any frontend or backend thigsn such as expo that requre internet can use internet, by offline i mean, no cloud servcies for now)

Step 2

Once Every Service is setup and configured, setup the database schema, create the database with proper relations, setup container, and do the other things as necessary

Step 3

Build the functionalities step by step

Major Functionalities:

1. Authentication:
    
    There will be mainly two roles, 
    
    1. User (the one who will be using the app)
        
        **Phone OTP Login/Signup Process:**
        
        1. **Entry Point**: User opens app → sees phone number input
        2. **Phone Validation**: Enter 10-digit Indian mobile number
        3. **OTP Generation**: System sends OTP via SMS (6-digit, 5min expiry)
        4. **User Status Check**:
            - **Existing User**: OTP verification → logged in
            - **New User**: OTP verification → registration form
        
        **New User Registration Flow:**
        
        1. **OTP Verified** → Registration form appears
        2. **Required Fields**:
            - Full Name
            - Email address
            - Age
            - Pincode
            - Address
            - Profile photo (optional)
        3. **Account Creation**: User logged in, profile created
        4. A registered user will have the access to the other functionalities of the app
    2. Admin (the one using the admin-dashboard):
        1. admin will have a fixed username and password that he uses for logging into admin-dashboard, no admin signup is there
2. Bicycle Repair Functionality:
    1. Admin POV:
        
        Admin will have a section in sidebar called, “Repair Section”, this will have two sub sections:
        
        1. “Repair request management” section:
            
            Here admin will be able to manage and perform action over all the repair request with all its associated data that he is getting from the user, by manage and perform action i mean:
            
            1. Approve the Repair request that comes from users - the request will be moved to 
                1. “Waiting for Payment” status (if online payment is clicked user), after which the user’s repair request will also update to “Waiting for Payment” status too, and then once the amount is paid, the repair request will move “Active” status, after which, the mechanic can visit and complete the work, and then the Request can be marked as “Completed” by the admin, updated on the user side too
                2. “Active” status (if offline, cash payment is clicked by user), after which, the mechanic can visit and complete the work, and then the Request can be marked as “Completed” by the admin, updated on the user side too
        2. “Edit Repair categories catalog” section
            
            Here admin will be able to edit the repair catalog that is shown to the user that includes
            
            1. change the “Service Mechanic Charge” Amount {purchasable item, this can have discount coupons}
            2. can update the “time slot” that is shown to user while is going through the repair requests, this is to increase or decrease the available time slots timing
            3. add, edit, update, delete “Repair Service” {Each “Repair Service” will have name, description, special instruction, price {{purchasable item, this can have discount coupons} }
    2. Users POV:
        
        User will have a section called “Book Repairs”, this will have a UI that beautifully shows the following:
        
        1. Name + Last Name, 
        2. Drop down section that will show all the list of “Repair Service” available and its price {purchasable item, this can have discount coupons} on the side {note the user can click and add multiple Repair services, and once added, it will be shown in a box that will show name, description, special instruction, price {purchasable item, this can have discount coupons} associated with that “Repair Service”, note: user can add multiple Repair service and their prices will add up
        3. Contact Number (fetched from user profile)
        4. alternate number (user can enter)
        5. Email Address
        6. Note for anything extra, or note {User can write a note, that admin can see and act if user wants something extra}
        7. upload images {some compression and then the images to be uploaded, the image number capped to 6 images max} {optional, but user can upload images if wants too}
        8. upload video {some compression and then the video to be uploaded, optional, but user can upload video too}
        9. Preferred date {popup to select future dates}
        10. “time slots” {can select from a range of time slots, example: 6am to 8am, 8am to 10am, … 8pm to 10pm}
        11. and then below will have proceed for payment
        
        the next page will show the whole details once again in a concise way, name, repair services selected, etc.. and then and this will also show the total sum of prices of all the “Repair Services” and that will be added with “Service Mechanic Charge”
        
        Now below that there will be an option to Apply Coupon {valid coupons will give discounts}, select the payment method, either pay online or pay offline and then user can click on submit repair request, that will send the request to admin,
        
        The request will be moved to my requests section and will be valid for 15minutes:
        
        here is what can happen: 
        
        1. within 15min: Admin approves the Request, and if user chose Online payment, the request will show “waiting for payment” status, after which the user can pay and once payment done, the request will move to “Active” status, after which mechanic will visit as per time and he can do the job, and after done, the admin will mark that as completed, and then it will show completed, and will be moved to past requests
        2. after 15min: the request gets expired, and it will be show expired on both parties

2. Rent Functionality:

1. Admin POV:
    
    Admin will have a section in sidebar called, “Rent Section”, this will have two sub sections:
    
    1. “Rental request management” section:
        
        Here admin will be able to manage and perform action over all the Rental request with all its associated data that he is getting from the user, by manage and perform action i mean:
        
        1. Approve the Rental request that comes from users - then request will be moved to  
            1. “Waiting for Payment” status (if online payment is clicked user), after which the user’s rental request will also update to “Waiting for Payment” status too, and then once the amount is paid, the rental request will move “arranging  delivery” status, after which, the people will deliver the bicycle to the given address and, once delivered, the Request can be marked as “Active Rental” by the admin, all this mark by admin will be updated to user side too, and later once everything is done, the admin will contact the owner (from profile number) and get the bicycle back and mark the request completed
            2. “arranging  delivery” status (if offline, cash payment is clicked by user),  after which, the people will deliver the bicycle to the given address and, once delivered, the Request can be marked as “Active Rental” by the admin, all this mark by admin will be updated to user side too, and later once everything is done, the admin will contact the owner (from profile number) and get the bicycle back and mark the request completed
    2. “Manage Bicycle Inventory” section:
        
        Here admin will be able to add bicycles to the inventory, edit the current bicycles, remove the bicycles form the rental section, this includes
        
        1. adding photos of the bicycles (5 photos can add)
        2. name of the bicycle, model, special instruction note,
        3. rent rate, daily and weekly {purchasable item, this can have discount coupons}
        4. specification {can be added in JSON format, by admin, and it will be shown nicely in the bicycle card}
        5. delivery charge for the bicycle {purchasable item, this can have discount coupons}
2. Users POV:
    
    User will have a section called “Book Rentals”, this will show as follow
    
    {instead of making this into a form format, make this into a multiple step format, so user can track what they are doing, for great User experience}
    
    Shows all the bicycle available for rent from the available catalog, with all the details that are mentioned there, here user can click on the bicycle he want to put rent request for, can select duration type {daily or weekly} contact number {fetched from account}, alternate number, delivery address {below this, the delivery charge will be shown, bicycle already has delivery charge included} and then special instruction note, where user can write something,
    
    then , there will be an option below will have proceed for payment
    
    the next page will show the whole details once again in a concise way, and total amount added up will show, based on rent duration, and the delivery charge and below that
    
    Now below that there will be an option to Apply Coupon {valid coupons will give discounts}, select the payment method, either pay online or pay offline and then user can click on submit rental request, that will send the request to admin,
    
    The request will be moved to my requests section and will be valid for 15minutes:
    
    here is what can happen: 
    
    1. within 15min: Admin approves the Request, and if user chose Online payment, the request will show “waiting for payment” status, after which the user can pay and once payment done, the request will move to “arranging  delivery” status, after which, the people will deliver the bicycle to the given address and, once delivered, the Request can be marked as “Active Rental” by the admin, all this mark by admin will be updated to user side too, and later once everything is done, a the admin will mark that as completed, and then it will show completed, and will be moved to past request
    2. after 15min: the request gets expired, and it will be show expired on both parties

1. Dashboard Functionality (For Admin Only)
    
    This section will allow user to have a look at all the major insights, which are, all the users and their details (accessible via a sub-section), Active Users, that all
    
2. Coupon Management system
    
    Admin will have a section called “Coupon manage” in the sidebar, that will allow the admin to create discount coupons, set expiry for all the items here that are marked with “{purchasable item, this can have discount coupons}”, each of these items can have multiple coupons, can change their discount rates
    
3. **Home Page Cards System:**
    1. Admin POV:
    
        Admin will have a section from where he can:
        
        - Add/edit promotional slides
        - Set external links (links, websites)
        - Upload images, set display order
        - Schedule card visibility

    2. User POV:
        
        User’s App will have a card slide thing at the top that will show all the promotional cards published by the admin