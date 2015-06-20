Tasks = new Mongo.Collection("tasks");

if (Meteor.isClient) {

  Meteor.subscribe("tasks");

  Template.body.helpers({

    tasks: function() {
      if (Session.get("hideCompleted")){
        //If hide completed is checked, filter tasks
        return Tasks.find({checked: {$ne: true}}, {sort: {createdAt: -1}});
      } else {
        //Otherwise, return all of the tasks
        return Tasks.find({}, {sort: {createdAt: -1}});
      }
    },
    hideCompleted: function() {
      return Session.get("hideCompleted");
    },
    incompleteCount: function() {
      return Tasks.find({checked: {$ne: true}}).count();
    },

  });

  // Inside the if (Meteor.isClient) block, right after Template.body.helpers:
  Template.body.events({
    "submit .new-task": function(event) {
      // This function is called when the new task form is submitted

      var text = event.target.text.value;

      Meteor.call("addTask", text);

      // Clear form
      event.target.text.value = "";

      // Prevent default form submit
      return false;
    },

    "change .hide-completed input": function(event) {
      Session.set("hideCompleted", event.target.checked);
    }
  });

  // In the client code, below everything else
  Template.task.events({
    "click .toggle-checked": function() {
      // Set the checked property to the opposite of its current value
      Meteor.call("setChecked", this._id, ! this.checked);
    },
    "click .delete": function() {
      Meteor.call("deleteTask", this._id);
    },
    "click .toggle-private": function() {
      Meteor.call("setPrivate", this._id, ! this.private);
    }
  });

  Template.task.helpers({
    isOwner: function() {
      return this.owner === Meteor.userId();
    }
  });

  Accounts.ui.config({
      passwordSignupFields: "USERNAME_ONLY"
  });

}

// At the bottom of simple-todos.js, outside of the client-only block
Meteor.methods({
  addTask: function(text) {
    // Make sure the user is logged in before inserting a task
    if(! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }

    Tasks.insert({
      text: text,
      createdAt: new Date(),
      owner: Meteor.userId(),
      username: Meteor.user().username
    });
  },
  deleteTask: function(taskId) {
    var task = Tasks.findOne(taskId);
    if(task.owner === Meteor.userId()) {
      // If the task is private, make sure only the owner can delete it
      Tasks.remove(task);
    } else {
      // stopped Meteor from throwing an issue unnecessarily
      throw new Meteor.Error("not-authorized");
    }
  },
  setChecked: function(taskId, setChecked) {
    var task = Tasks.findOne(taskId);
    if(task.owner === Meteor.userId()) {
      Tasks.update(task, {$set: { checked: setChecked } });
    } else {
      // stopped Meteor from throwing an issue unnecessarily
      // if statement does not return function
      // error must be in if block.
      throw new Meteor.Error("not-authorized");
    }
  },
  setPrivate: function(taskId, setToPrivate) {
    var task = Tasks.findOne(taskId);
    //Make sure only the task owner can make a task private
    if(task.owner === Meteor.userId()) {
      Tasks.update(task, { $set: { private: setToPrivate } });
    } else {
      // stopped Meteor from throwing an issue unnecessarily
      throw new Meteor.Error("not-authorized");
    }
  }
});

if (Meteor.isServer) {
  Meteor.publish("tasks", function() {
    // Only publish tasks that are public or belong to the current user
    return Tasks.find({
      $or: [ { private: {$ne: true} }, { owner: this.userId }]
    });
  });
}
