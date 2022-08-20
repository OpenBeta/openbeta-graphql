# OpenBeta Database Conecpts

Here are some observations about the problems unique to OpenBeta. Where they are not unique, you may simply find a link or quote.

> Helpful Resources
> [Model Tree Structures with Materialized Paths](https://www.mongodb.com/docs/manual/tutorial/model-tree-structures-with-materialized-paths/)
> [Literally the entire MondoDB docs](https://www.mongodb.com/docs/)

## Handling User Data

There is all kinds of data related to user authorization  and interaction in the database *(NOT Authentication, that is always handled by Auth0)*. For the data to be properly looped-in on the backend, there really is not a better place to store these large volumes of user data than where the API can rapidly query along with climbing data.

So then, how do we determine what goes inside the database and what goes elsewhere?

1. Is this information **about** the user? If it is, and it's not something like a username or bio, it probably belongs in the Auth0 store.
2. Is this a potentially high volume of data about user actions / interactions WITHIN the system? If it is, it almost certainly belongs inside the mongo datastore.

We are not Facebook, if it's not climbing related then don't store it.

## Climbing grades

As with any i18n problem, you need to store one kind of data and then deliver another kind of localized data to the end user.

Sounds simple enough but...

![grade chart 2](https://www.climbing.co.za/wp-content/uploads/2012/10/climbza_gradechart.png)

...There are some nuances.

I18n is not the only problem, routes often drift from the grade that they are opened at (Again due to the subjectives of grading)

**Essential problem set:**
1. Arbitrary grade overlap
2. What to do if a new grade system evolves / forks?
3. Grade systems can drift from the mapping against other systems as international opinion gets more refined
4. Grading is subjective for a host of reasons
5. Climb grades can ALSO change over time

Part of the problem is that these grades were never designed to inter-op, but the other part is that grading systems are not perfectly objective.

#### Grade Fidelity

If someone supplies **7a** we know it could be either a **B8** OR **B9**. 

7a is the opinion provided by the user, and so we need to record that, the solution for internationalizing that opinion will involve building a mapping that gets us as close as possible to understanding the upper and lower bounds of all grades.
