'use strict';

var expect   = require('chai').expect;
var mongoose = require('mongoose');

var Board  = require('../models/board.js');
var Thread = require('../models/thread.js');
var Reply  = require('../models/reply.js');

mongoose.connect(process.env.DB, { useNewUrlParser: true, useFindAndModify: false });

module.exports = function (app) {
  
  app.route('/api/threads/:board')
    .get(function(req, res) {
    
      // Search for the board:
      Board.findOne({ board_name: req.params.board })
        .populate({
          path: 'threads',
          select: '-reported -password',
          options: { limit: 10, sort: { bumped_on: -1 } },
          populate: { path: 'replies',
                      model: 'Reply',
                      options: { sort: { created_on: -1 } }
                    }
        })
        .select('threads')
        .exec(function(err, docs) {
          if(err || !docs)
            return res.send("Error while retrieving threads.");
          
          // Add the replycount to the threads:
          let threads = docs.threads.map(function(thread) {
            // Returning the line below wasn't assigning replycount to thread (?):
            // thread.replycount = thread.replies.length;
            
            let replies = thread.replies.slice(0, 3);
            let threadReply = {
              _id: thread._id,
              text: thread.text,
              created_on: thread.created_on,
              bumped_on: thread.bumped_on,
              replies: replies,
              replycount: thread.replies.length
            }
            return threadReply;
          });
        
          // Return a json with an array of threads:
          return res.json(threads);
        });
    })
    .post(function(req, res) {
      // Find the board:
      let board;
      Board.findOne({ board_name: req.params.board }, function(err, doc) {
        if(err)
          return res.send("Couldn't post new thread");
        
        // If a board was found, use it:
        if(doc)
          board = doc;
        else
          // If not, create a new board:
          board = new Board({
            _id: mongoose.Types.ObjectId(),
            board_name: req.params.board
          });
        
        // Create the new thread:
        let newThread = new Thread({
          _id: new mongoose.Types.ObjectId(),
          text: req.body.text,
          password: req.body.delete_password,
          created_on: new Date(),
          bumped_on: new Date(),
          reported: false
        });
        
        // Add the thread to the board:
        board.threads.push(newThread);
        
        // Save the thread:
        newThread.save(function(err) {
          if(err)
              return res.send("Couldn't post new thread");
        
          // Save the board:
          board.save(function(err) {
            if(err)
                return res.send("Couldn't post new thread");

            // Redirect to the board page:
            return res.redirect(`/b/${board.board_name}?_id=${newThread._id}`);
          });
        });
      });
    })
    .put(function(req, res) {
    
      Thread.findByIdAndUpdate(
        req.body.report_id,
        { $set: { reported: true } },
        function(err, doc) {
          if(err || !doc)
            return res.send("Couldn't report the thread.");
          
          return res.send('Report successful.');
        });
    })
    .delete(function(req, res) {
    
        Board.findOne({ board_name: req.params.board })
          .populate({
            path: 'threads',
            match: { _id: req.body.thread_id,
                     password: req.body.delete_password
                   }
          })
          .select('threads')
          .exec(function(err, doc) {
            // Check if a valid document with a single thread was returned:
            if(err || !doc || doc.threads.length === 0)
              return res.send('Incorrect password.');
            
              // Remove the thread reference from the board:
              Board.findOneAndUpdate(
                { board_name: req.params.board },
                { $pull: { threads: req.body.thread_id } },
                (err, doc) => {});
          
              // Delete the thread:
              doc.threads[0].remove();
          
            return res.send('Delete successfull.');
        });
    });
    
  app.route('/api/replies/:board')
    .get(function(req, res) {
    
      // Check for the thread_id:
      if(!req.query.thread_id)
        return res.send("Error while retrieving data.");
    
      Board.findOne({ board_name: req.params.board })
        .populate({
          path: 'threads',
          match: { _id: req.query.thread_id },
          populate: { path: 'replies',
                      model: 'Reply',
                      select: '-reported -password',
                    }
        })
        .select('threads')
        .exec(function(err, docs) {
          if(err)
            return res.send("Error while retrieving data.");
        
          // Return a json with the thread and its replies:
          return res.json(docs.threads[0]);
        });
    })
    .post(function(req, res) {
    
      // Search for the thread:
      Board.findOne({ board_name: req.params.board })
        .populate({
          path: 'threads',
          match: { _id: req.body.thread_id }
        })
        .select('threads')
        .exec(function(err, doc) {
          if(err || !doc || doc.threads.length === 0)
            return res.send("Couldn't reply to the thread.");
                
          // Create the reply:
          let newReply = new Reply({
            _id        : mongoose.Types.ObjectId(),
            text       : req.body.text,
            password   : req.body.delete_password,
            created_on : new Date(),
            reported   : false
          });
        
          // Update the bumped_on date of the thread:
          doc.threads[0].bumped_on = new Date();
        
          // Add reply to the thread:
          doc.threads[0].replies.push(newReply);
        
          // Save the reply:
          newReply.save(function(err) {
            if(err)
              return res.send("Couldn't reply to the thread.");
            
            // Save thread:
            doc.threads[0].save(function(err) {
              if(err)
                return res.send("Couldn't reply to the thread.");
              // Redirect to the thread page:
              return res.redirect(`/b/${req.params.board}/${req.body.thread_id}`);
            });
          });
        });
    })
    .put(function(req, res) {
    
      Reply.findByIdAndUpdate(
        req.body.reply_id,
        { $set: { reported: true } },
        function(err, doc) {
          if(err || !doc)
            return res.send("Couldn't report the reply.");
          
          return res.send('Report successful.');
        });
    })
    .delete(function(req, res) {
    
      Board.findOne({ board_name: req.params.board })
        .populate({
          path: 'threads',
          match: { _id: req.body.thread_id },
          populate: { path: 'replies',
                      model: 'Reply',
                      match: { _id: req.body.reply_id,
                               password: req.body.delete_password }
                             }
        })
        .select('replies')
        .exec(function(err, doc) {
          // Check if a valid document with threads and replies was returned:
          if(err || !doc || (doc.threads.length === 0)
              || (doc.threads[0].replies.length === 0))
            return res.send('Incorrect password.');
            
            // Remove the reply reference from the thread:
            Thread.findOneAndUpdate(
              { _id: req.body.thread_id },
              { $pull: { replies: req.body.reply_id } },
              (err, doc) => {});

            // Delete the reply:
            doc.threads[0].replies[0].remove();

          return res.send('Delete successfull.');
      });
    });

};
