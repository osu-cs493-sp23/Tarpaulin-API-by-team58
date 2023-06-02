# Tarpaulin API

## Entities
There are several kinds of entity the Tarpaulin API will need to keep track of:
* Users – These represent Tarpaulin application users.  Each User can have one of three roles: admin, instructor, and student.  Each of these roles represents a different set of permissions to perform certain API actions.  The permissions associated with these roles are defined further in the Tarpaulin OpenAPI specification.
* Courses – These represent courses being managed in Tarpaulin.  Each Course has basic information, such as subject code, number, title, instructor, etc.  Each Course also has associated data of other entity types, including a list of enrolled students (i.e. Tarpaulin Users with the student role) as well as a set of assignments.  More details about how to manage these pieces of data are included both below and in the Tarpaulin OpenAPI specification linked above.
* Assignments – These represent a single assignment for a Tarpaulin Course.  Each Assignment belongs to a specific Course and has basic information such as a title, due date, etc.  It also has a list of individual student submissions.
* Submissions – These represent a single student submission for an Assignment in Tarpaulin.  Each submission belongs both to its Assignment to the student who submitted it, and it is marked with a submission timestamp.  Each submission is also associated with a specific file, which will be uploaded to the Tarpaulin API and stored, so it can be downloaded later.  Finally, each submission may be assigned a grade, though grades cannot be assigned when the submission is first created but must be assigned later through an update operation.

## Actions
Many of the actions that can be performed with the Tarpaulin API are similar to ones we’ve seen in the work we’ve done in class, including fetching entity data and creating, modifying, and deleting entities.  These actions should not need much explanation beyond what’s included in the Tarpaulin OpenAPI specification.  A few specific actions deserve more attention, though:
* Course roster download – this action, implemented by the GET /courses/{id}/roster endpoint, allows certain authorized users to download a CSV-formatted roster for a specific course.  The roster will contain a list of the students currently enrolled in the course, in CSV format, e.g
* Assignment submission creation – this action, implemented by the POST /assignments/{id}/submissions endpoint, allows authorized student Users to upload a file submission for a specific assignment.  Importantly, the file uploaded for each Submission must be stored by the API in such a way that it can be later downloaded via URL.  Specifically, when storing the submission file, the API should generate the URL with which that file can later be accessed.  This URL will be returned along with the rest of the information about the Submission from the GET /assignments/{id}/submissions endpoint.
* User data fetching – this action, implemented by the GET /users/{id} endpoint, allows Users to see their own data.  Importantly, only a logged-in User can see their own data.  The data returned by this endpoint should also include the list of classes the User is enrolled in (for student Users) or teaching (for instructor Users).
* Course information fetching – this action, implemented by the GET /courses and GET /courses/{id} endpoints, allows users to see information about all Courses or about a specific Course.  Note that the information included by both of these endpoints should not return information about a Course’s enrolled students or its Assignments.  Instead, that information can be fetched by the GET /courses/{id}/students and GET /courses/{id}/assignments endpoints, respectively

## Pagination
A few of the Tarpaulin API endpoints must be paginated:
* GET /courses
* GET /assignments/{id}/submissions
It’s up to you to determine the appropriate way to paginate these endpoints, including how the page size is set, etc.

## Authorization
Many of the endpoints in the Tarpaulin API require authorization, as described in the Tarpaulin OpenAPI specification.  You may implement this using the standard JWT-based authorization scheme we discussed in class.

## Rate limiting
Your API should be rate-limited as follows:
* For requests made without a valid authentication token, your API should permit 10 requests/minute.  These requests should be rate-limited on a per-IP address basis.
* For requests made with a valid authentication token, your API should permit 30 requests per minute.  These requests should be rate-limited on a per-user basis.

## Docker
All services used by your API (e.g. databases, caches, processing pipelines, etc.) should be run in Docker containers.  These containers can be manually created and initialized via the command line.
