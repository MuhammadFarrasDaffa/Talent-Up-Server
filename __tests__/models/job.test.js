const mongoose = require("mongoose");
const Job = require("../../models/Job");

describe("Job Model", () => {
  describe("Schema validation", () => {
    it("should create job with required fields", async () => {
      const jobData = {
        title: "Software Engineer",
        company: "Tech Corp",
        jobUrl: "https://example.com/job/1",
        externalId: "ext-123",
      };

      const job = await Job.create(jobData);

      expect(job._id).toBeDefined();
      expect(job.title).toBe("Software Engineer");
      expect(job.company).toBe("Tech Corp");
      expect(job.location).toBe("Indonesia"); // default
      expect(job.source).toBe("Glints"); // default
    });

    it("should fail without title", async () => {
      const jobData = {
        company: "Tech Corp",
        jobUrl: "https://example.com/job/1",
        externalId: "ext-no-title",
      };

      await expect(Job.create(jobData)).rejects.toThrow();
    });

    it("should fail without company", async () => {
      const jobData = {
        title: "Software Engineer",
        jobUrl: "https://example.com/job/1",
        externalId: "ext-no-company",
      };

      await expect(Job.create(jobData)).rejects.toThrow();
    });

    it("should fail without jobUrl", async () => {
      const jobData = {
        title: "Software Engineer",
        company: "Tech Corp",
        externalId: "ext-no-url",
      };

      await expect(Job.create(jobData)).rejects.toThrow();
    });

    it("should enforce unique externalId", async () => {
      await Job.create({
        title: "Job 1",
        company: "Company 1",
        jobUrl: "https://example.com/1",
        externalId: "unique-ext-id",
      });

      await expect(
        Job.create({
          title: "Job 2",
          company: "Company 2",
          jobUrl: "https://example.com/2",
          externalId: "unique-ext-id",
        }),
      ).rejects.toThrow();
    });
  });

  describe("Default values", () => {
    it("should set default location", async () => {
      const job = await Job.create({
        title: "Developer",
        company: "Corp",
        jobUrl: "https://example.com/j",
        externalId: "ext-default-loc",
      });

      expect(job.location).toBe("Indonesia");
    });

    it("should set default salary", async () => {
      const job = await Job.create({
        title: "Developer",
        company: "Corp",
        jobUrl: "https://example.com/j2",
        externalId: "ext-default-sal",
      });

      expect(job.salary).toBe("Confidential");
    });

    it("should set default source", async () => {
      const job = await Job.create({
        title: "Developer",
        company: "Corp",
        jobUrl: "https://example.com/j3",
        externalId: "ext-default-src",
      });

      expect(job.source).toBe("Glints");
    });

    it("should set default postedAt to now", async () => {
      const beforeCreate = new Date();
      const job = await Job.create({
        title: "Developer",
        company: "Corp",
        jobUrl: "https://example.com/j4",
        externalId: "ext-default-posted",
      });
      const afterCreate = new Date();

      expect(job.postedAt).toBeDefined();
      expect(job.postedAt.getTime()).toBeGreaterThanOrEqual(
        beforeCreate.getTime(),
      );
      expect(job.postedAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    });
  });

  describe("Array fields", () => {
    it("should store skills array", async () => {
      const job = await Job.create({
        title: "Full Stack Developer",
        company: "Tech Corp",
        jobUrl: "https://example.com/fullstack",
        externalId: "ext-skills",
        skills: ["JavaScript", "React", "Node.js", "MongoDB"],
      });

      expect(job.skills).toHaveLength(4);
      expect(job.skills).toContain("JavaScript");
      expect(job.skills).toContain("React");
    });

    it("should store requirements array", async () => {
      const job = await Job.create({
        title: "Developer",
        company: "Corp",
        jobUrl: "https://example.com/req",
        externalId: "ext-req",
        requirements: [
          "3+ years experience",
          "Bachelor degree",
          "Good communication",
        ],
      });

      expect(job.requirements).toHaveLength(3);
    });

    it("should store benefits array", async () => {
      const job = await Job.create({
        title: "Developer",
        company: "Corp",
        jobUrl: "https://example.com/ben",
        externalId: "ext-ben",
        benefits: ["Health insurance", "Remote work", "Annual bonus"],
      });

      expect(job.benefits).toHaveLength(3);
    });
  });

  describe("Company details subdocument", () => {
    it("should store company details", async () => {
      const job = await Job.create({
        title: "Developer",
        company: "Tech Corp",
        jobUrl: "https://example.com/cd",
        externalId: "ext-cd",
        companyDetails: {
          industry: "Information Technology",
          size: "51-200 employees",
          website: "https://techcorp.com",
          address: "123 Tech Street, Jakarta",
          description: "Leading technology company",
        },
      });

      expect(job.companyDetails.industry).toBe("Information Technology");
      expect(job.companyDetails.size).toBe("51-200 employees");
    });
  });

  describe("Job metadata", () => {
    it("should store job type", async () => {
      const job = await Job.create({
        title: "Developer",
        company: "Corp",
        jobUrl: "https://example.com/jt",
        externalId: "ext-jt",
        jobType: "Full Time",
      });

      expect(job.jobType).toBe("Full Time");
    });

    it("should store experience level", async () => {
      const job = await Job.create({
        title: "Developer",
        company: "Corp",
        jobUrl: "https://example.com/el",
        externalId: "ext-el",
        experienceLevel: "3-5 years",
      });

      expect(job.experienceLevel).toBe("3-5 years");
    });

    it("should store minimum education", async () => {
      const job = await Job.create({
        title: "Developer",
        company: "Corp",
        jobUrl: "https://example.com/me",
        externalId: "ext-me",
        minEducation: "Bachelor (S1)",
      });

      expect(job.minEducation).toBe("Bachelor (S1)");
    });
  });
});
